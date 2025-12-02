import axios, { AxiosInstance, AxiosError } from 'axios';
import { createHash } from 'crypto';
import { env } from '../config/env';
import { redis as redisClient } from '../config/redis';
import type { RequestContext } from '../types/context.types';
import {
  FluentisResponse,
  ExportRequest,
  ExportResponse,
  ImportRequest,
  ImportResponse,
  ServiceRequest,
  ServiceResponse,
  OperationRequest,
  OperationResponse,
  FluentisMethodType,
  FluentisCacheConfig,
  DEFAULT_CACHE_CONFIG,
  FilterBuilder,
  FSItem,
  FSItemStock,
  FSItemAvailability,
  FSSalesOrder,
  FSSalesInvoice,
  FSSalesDeliveryNote,
  FSPurchaseOrder,
  FSPurchaseInvoice,
  FSContact,
  FSPosting,
  FSMaturity,
  FSWarehousePosting,
  FSPhysicalInventory,
  FSPicking,
} from '../types/fluentis.types';

/**
 * Fluentis WebAPI Service - Complete Implementation
 * Context-Aware, Redis-Cached, Fully-Typed Fluentis ERP Integration
 */

interface FluentisAuth {
  username: string;
  password: string;
}

interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryableErrors: string[];
}

export class FluentisService {
  private client: AxiosInstance;
  private auth: FluentisAuth;
  private retryConfig: RetryConfig;

  constructor() {
    
    this.auth = {
      username: env.FLUENTIS_USER,
      password: env.FLUENTIS_PASSWORD,
    };

    this.retryConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ECONNABORTED', 'ENOTFOUND', 'EAI_AGAIN'],
    };

    this.client = axios.create({
      baseURL: env.FLUENTIS_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${this.auth.username}:${this.auth.password}`).toString('base64')}`,
      },
      timeout: 60000, // 60 seconds
      validateStatus: (status) => status < 500, // Don't throw on 4xx errors
    });
    
    console.log('🔗 FluentisService connected to:', env.FLUENTIS_BASE_URL);

    // Add request interceptor for logging
    this.client.interceptors.request.use((config) => {
      console.log(`📤 Fluentis API Request: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ Fluentis API Response: ${response.status}`);
        return response;
      },
      (error) => {
        console.error(`❌ Fluentis API Error:`, error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Extract Company/Department from RequestContext
   */
  private getContextCompanyDepartment(context?: RequestContext): {
    companyCode?: string;
    departmentCode?: string;
  } {
    if (!context?.company) {
      return {
        companyCode: env.FLUENTIS_COMPANY_CODE,
        departmentCode: env.FLUENTIS_DEPARTMENT_CODE,
      };
    }

    return {
      companyCode: context.company.fluentisCompanyCode || env.FLUENTIS_COMPANY_CODE,
      departmentCode: context.company.fluentisDepartmentCode || env.FLUENTIS_DEPARTMENT_CODE,
    };
  }

  /**
   * Generate cache key from request parameters
   */
  private generateCacheKey(prefix: string, params: any): string {
    const paramsString = JSON.stringify(params);
    const hash = createHash('sha256').update(paramsString).digest('hex').substring(0, 16);
    return `${prefix}:${hash}`;
  }

  /**
   * Get cached response
   */
  private async getCachedResponse<T>(key: string): Promise<T | null> {
    try {
      const cached = await redisClient.get(key);
      if (cached) {
        console.log(`💾 Cache HIT: ${key}`);
        return JSON.parse(cached);
      }
      console.log(`🔍 Cache MISS: ${key}`);
      return null;
    } catch (error) {
      console.warn('⚠️  Redis cache read error:', error);
      return null;
    }
  }

  /**
   * Set cached response
   */
  private async setCachedResponse(key: string, data: any, ttl: number): Promise<void> {
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(data));
      console.log(`💾 Cached: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      console.warn('⚠️  Redis cache write error:', error);
    }
  }

  /**
   * Invalidate cache by pattern
   */
  private async invalidateCache(pattern: string): Promise<void> {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
        console.log(`🗑️  Invalidated ${keys.length} cache entries: ${pattern}`);
      }
    } catch (error) {
      console.warn('⚠️  Redis cache invalidation error:', error);
    }
  }

  /**
   * Retry logic for failed requests
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retryCount = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      const isRetryable = this.retryConfig.retryableErrors.some(
        (code) => error.code === code || error.message?.includes(code)
      );

      if (isRetryable && retryCount < this.retryConfig.maxRetries) {
        const delay = this.retryConfig.retryDelay * Math.pow(2, retryCount);
        console.log(`🔄 Retrying in ${delay}ms... (attempt ${retryCount + 1}/${this.retryConfig.maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.executeWithRetry(operation, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Handle Fluentis API errors
   */
  private handleFluentisError(error: any, context: string): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<FluentisResponse>;
      
      if (axiosError.response) {
        const status = axiosError.response.status;
        const data = axiosError.response.data;

        if (status === 401) {
          throw new Error(`Fluentis Authentication Failed: Invalid credentials`);
        }

        if (status === 403) {
          throw new Error(`Fluentis Authorization Failed: Insufficient permissions for ${context}`);
        }

        if (status === 404) {
          throw new Error(`Fluentis Endpoint Not Found: ${context}`);
        }

        if (data?.ErrorMessage) {
          throw new Error(`Fluentis Error (${context}): ${data.ErrorMessage}`);
        }

        throw new Error(`Fluentis HTTP ${status} Error: ${context}`);
      }

      if (axiosError.code === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to Fluentis server: Connection refused`);
      }

      if (axiosError.code === 'ETIMEDOUT') {
        throw new Error(`Fluentis request timeout: ${context}`);
      }

      throw new Error(`Fluentis Network Error (${context}): ${axiosError.message}`);
    }

    throw new Error(`Fluentis Unknown Error (${context}): ${error.message}`);
  }

  // ============================================================================
  // CORE API METHODS (Export, Import, Service, Operation)
  // ============================================================================

  /**
   * Export data from Fluentis (Read-Only, Cacheable)
   */
  async export<T = any>(
    controller: string,
    method: string,
    options: {
      exportFilter?: string;
      objectsToExport?: Array<{ Id: number }>;
      skip?: number;
      take?: number;
      sortField?: string;
      sortOrder?: 'asc' | 'desc';
      fluentisFormat?: string;
      companyCode?: string;
      departmentCode?: string;
      context?: RequestContext;
      cache?: {
        enabled?: boolean;
        ttl?: number;
      };
    } = {}
  ): Promise<ExportResponse<T>> {
    // Context-Aware: usa Company/Department dal context se disponibile
    const { companyCode, departmentCode } = this.getContextCompanyDepartment(options.context);

    const request: ExportRequest = {
      Format: 1, // JSON
      CompanyCode: options.companyCode || companyCode,
      DepartmentCode: options.departmentCode || departmentCode,
      FluentisFormat: options.fluentisFormat,
      ExportFilter: options.exportFilter,
      ObjectsToExport: options.objectsToExport,
      Skip: options.skip,
      Take: options.take,
      SortField: options.sortField,
      SortOrder: options.sortOrder,
    };

    const endpoint = `/${controller}/${method}`;

    // Check cache
    const cacheEnabled = options.cache?.enabled ?? true;
    const cacheTtl = options.cache?.ttl ?? DEFAULT_CACHE_CONFIG.Export.ttl;
    
    if (cacheEnabled) {
      const cacheKey = this.generateCacheKey(`${DEFAULT_CACHE_CONFIG.Export.keyPrefix}:${controller}:${method}`, request);
      const cached = await this.getCachedResponse<ExportResponse<T>>(cacheKey);
      
      if (cached) {
        return cached;
      }

      // Execute request with retry
      const data = await this.executeWithRetry(async () => {
        try {
          const response = await this.client.post<ExportResponse<T>>(endpoint, request);
          
          if (response.status >= 400) {
            this.handleFluentisError(response, `export ${controller}/${method}`);
          }

          if (!response.data.Success) {
            throw new Error(response.data.ErrorMessage || 'Fluentis export failed');
          }

          return response.data;
        } catch (error) {
          this.handleFluentisError(error, `export ${controller}/${method}`);
        }
      });

      // Cache result
      await this.setCachedResponse(cacheKey, data, cacheTtl);
      return data;
    }

    // Execute without cache
    return this.executeWithRetry(async () => {
      try {
        const response = await this.client.post<ExportResponse<T>>(endpoint, request);
        
        if (response.status >= 400) {
          this.handleFluentisError(response, `export ${controller}/${method}`);
        }

        if (!response.data.Success) {
          throw new Error(response.data.ErrorMessage || 'Fluentis export failed');
        }

        return response.data;
      } catch (error) {
        this.handleFluentisError(error, `export ${controller}/${method}`);
      }
    });
  }

  /**
   * Import data to Fluentis (Write Operation, Invalidates Cache)
   */
  async import<T = any>(
    controller: string,
    method: string,
    data: T | T[],
    options: {
      validateOnly?: boolean;
      updateExisting?: boolean;
      ignoreWarnings?: boolean;
      fluentisFormat?: string;
      companyCode?: string;
      departmentCode?: string;
      context?: RequestContext;
    } = {}
  ): Promise<ImportResponse> {
    const { companyCode, departmentCode } = this.getContextCompanyDepartment(options.context);

    // Convert data to JSON string and encode
    const dataString = JSON.stringify(Array.isArray(data) ? data : [data]);
    const binaryContent = Buffer.from(dataString).toString('base64');

    const request: ImportRequest = {
      Format: 1, // JSON
      CompanyCode: options.companyCode || companyCode,
      DepartmentCode: options.departmentCode || departmentCode,
      FluentisFormat: options.fluentisFormat,
      BinaryContent: binaryContent,
      ValidateOnly: options.validateOnly,
      UpdateExisting: options.updateExisting,
      IgnoreWarnings: options.ignoreWarnings,
    };

    const endpoint = `/${controller}/${method}`;

    // Execute with retry
    const result = await this.executeWithRetry(async () => {
      try {
        const response = await this.client.post<ImportResponse>(endpoint, request);
        
        if (response.status >= 400) {
          this.handleFluentisError(response, `import ${controller}/${method}`);
        }

        if (!response.data.Success) {
          throw new Error(response.data.ErrorMessage || 'Fluentis import failed');
        }

        return response.data;
      } catch (error) {
        this.handleFluentisError(error, `import ${controller}/${method}`);
      }
    });

    // Invalidate related caches
    if (!options.validateOnly) {
      await this.invalidateCache(`${DEFAULT_CACHE_CONFIG.Export.keyPrefix}:${controller}:*`);
      await this.invalidateCache(`${DEFAULT_CACHE_CONFIG.Service.keyPrefix}:${controller}:*`);
      console.log(`♻️  Invalidated caches for controller: ${controller}`);
    }

    return result;
  }

  /**
   * Execute a service call (Read-Only, Cacheable)
   */
  async service<T = any>(
    controller: string,
    method: string,
    params: Record<string, any> = {},
    options: {
      companyCode?: string;
      departmentCode?: string;
      context?: RequestContext;
      cache?: {
        enabled?: boolean;
        ttl?: number;
      };
    } = {}
  ): Promise<ServiceResponse<T>> {
    const { companyCode, departmentCode } = this.getContextCompanyDepartment(options.context);

    const request: ServiceRequest = {
      ...params,
      Format: 1,
      CompanyCode: options.companyCode || companyCode,
      DepartmentCode: options.departmentCode || departmentCode,
    };

    const endpoint = `/${controller}/${method}`;

    // Check cache
    const cacheEnabled = options.cache?.enabled ?? true;
    const cacheTtl = options.cache?.ttl ?? DEFAULT_CACHE_CONFIG.Service.ttl;
    
    if (cacheEnabled) {
      const cacheKey = this.generateCacheKey(`${DEFAULT_CACHE_CONFIG.Service.keyPrefix}:${controller}:${method}`, request);
      const cached = await this.getCachedResponse<ServiceResponse<T>>(cacheKey);
      
      if (cached) {
        return cached;
      }

      // Execute request
      const data = await this.executeWithRetry(async () => {
        try {
          const response = await this.client.post<ServiceResponse<T>>(endpoint, request);
          
          if (response.status >= 400) {
            this.handleFluentisError(response, `service ${controller}/${method}`);
          }

          if (!response.data.Success) {
            throw new Error(response.data.ErrorMessage || 'Fluentis service call failed');
          }

          return response.data;
        } catch (error) {
          this.handleFluentisError(error, `service ${controller}/${method}`);
        }
      });

      // Cache result
      await this.setCachedResponse(cacheKey, data, cacheTtl);
      return data;
    }

    // Execute without cache
    return this.executeWithRetry(async () => {
      try {
        const response = await this.client.post<ServiceResponse<T>>(endpoint, request);
        
        if (response.status >= 400) {
          this.handleFluentisError(response, `service ${controller}/${method}`);
        }

        if (!response.data.Success) {
          throw new Error(response.data.ErrorMessage || 'Fluentis service call failed');
        }

        return response.data;
      } catch (error) {
        this.handleFluentisError(error, `service ${controller}/${method}`);
      }
    });
  }

  /**
   * Execute an operation (Read-Write, Invalidates Cache)
   */
  async operation<T = any>(
    controller: string,
    method: string,
    params: Record<string, any> = {},
    options: {
      companyCode?: string;
      departmentCode?: string;
      context?: RequestContext;
    } = {}
  ): Promise<OperationResponse> {
    const { companyCode, departmentCode } = this.getContextCompanyDepartment(options.context);

    const request: OperationRequest = {
      ...params,
      Format: 1,
      CompanyCode: options.companyCode || companyCode,
      DepartmentCode: options.departmentCode || departmentCode,
    };

    const endpoint = `/${controller}/${method}`;

    // Execute with retry
    const result = await this.executeWithRetry(async () => {
      try {
        const response = await this.client.post<OperationResponse>(endpoint, request);
        
        if (response.status >= 400) {
          this.handleFluentisError(response, `operation ${controller}/${method}`);
        }

        if (!response.data.Success) {
          throw new Error(response.data.ErrorMessage || 'Fluentis operation failed');
        }

        return response.data;
      } catch (error) {
        this.handleFluentisError(error, `operation ${controller}/${method}`);
      }
    });

    // Invalidate related caches
    await this.invalidateCache(`${DEFAULT_CACHE_CONFIG.Export.keyPrefix}:${controller}:*`);
    await this.invalidateCache(`${DEFAULT_CACHE_CONFIG.Service.keyPrefix}:${controller}:*`);
    console.log(`♻️  Invalidated caches for controller: ${controller}`);

    return result;
  }

  // ====== HELPER METHODS ======

  /**
   * Create a new FilterBuilder instance
   */
  createFilter(): FilterBuilder {
    return new FilterBuilder();
  }

  // ====== SPECIFIC TYPED METHODS ======

  /**
   * Export Sales Orders from SD area
   */
  async exportSalesOrders(options: {
    filter?: string | FilterBuilder;
    dateFrom?: string;
    dateTo?: string;
    customerId?: string;
    status?: string;
    context?: RequestContext;
  } = {}): Promise<ExportResponse<FSSalesOrder[]>> {
    let filter = options.filter;

    // Build filter from date range and customerId if not provided
    if (!filter && (options.dateFrom || options.dateTo || options.customerId || options.status)) {
      const fb = new FilterBuilder();
      if (options.dateFrom) fb.greaterThanOrEqual('OrderDate', `#!${options.dateFrom}!#`);
      if (options.dateTo) fb.lessThanOrEqual('OrderDate', `#!${options.dateTo}!#`);
      if (options.customerId) fb.equals('CustomerId', options.customerId);
      if (options.status) fb.equals('Status', options.status);
      filter = fb;
    }

    return this.export<FSSalesOrder[]>(
      'SD/SalesOrder',
      'ExportSalesOrders',
      {
        exportFilter: typeof filter === 'string' ? filter : filter?.build(),
        context: options.context,
      }
    );
  }

  /**
   * Export Items from WM area
   */
  async exportItems(options: {
    filter?: string | FilterBuilder;
    itemCodes?: string[];
    active?: boolean;
    context?: RequestContext;
  } = {}): Promise<ExportResponse<FSItem[]>> {
    let filter = options.filter;
    
    // Build filter from itemCodes if provided
    if (!filter && options.itemCodes && options.itemCodes.length > 0) {
      const fb = new FilterBuilder();
      fb.in('ItemCode', options.itemCodes);
      filter = fb;
    }
    
    return this.export<FSItem[]>(
      'WM/Common',
      'ExportItems',
      {
        exportFilter: typeof filter === 'string' ? filter : filter?.build(),
        context: options.context,
      }
    );
  }

  /**
   * Get Items Stock from WM area
   */
  async getItemsStock(options: {
    itemCodes?: string[];
    warehouseCodes?: string[];
    context?: RequestContext;
  } = {}): Promise<ServiceResponse<FSItemStock[]>> {
    return this.service<FSItemStock[]>(
      'WM/Common',
      'GetItemsStock',
      {
        ItemCodes: options.itemCodes,
        WarehouseCodes: options.warehouseCodes,
      },
      {
        context: options.context,
        cache: { enabled: true, ttl: 120 }, // 2 min cache
      }
    );
  }

  /**
   * Get Items Availability (check if requested quantity is available)
   */
  async getItemsAvailability(
    requests: Array<{
      itemCode: string;
      requestedQuantity: number;
      warehouseCode?: string;
    }>,
    options: { context?: RequestContext } = {}
  ): Promise<ServiceResponse<FSItemAvailability[]>> {
    return this.service<FSItemAvailability[]>(
      'WM/Common',
      'GetItemsAvailability',
      {
        AvailabilityRequests: requests.map(r => ({
          ItemCode: r.itemCode,
          RequestedQuantity: r.requestedQuantity,
          WarehouseCode: r.warehouseCode,
        })),
      },
      {
        context: options.context,
        cache: { enabled: true, ttl: 60 }, // 1 min cache
      }
    );
  }

  /**
   * Export Contacts from SH area
   */
  async exportContacts(options: {
    filter?: string | FilterBuilder;
    contactType?: 'Customer' | 'Supplier' | 'Both' | 'Other';
    active?: boolean;
    context?: RequestContext;
  } = {}): Promise<ExportResponse<FSContact[]>> {
    let filter = options.filter;

    if (!filter && (options.contactType || options.active !== undefined)) {
      const fb = new FilterBuilder();
      if (options.contactType) fb.equals('ContactType', options.contactType);
      if (options.active !== undefined) fb.equals('Active', options.active);
      filter = fb;
    }

    return this.export<FSContact[]>(
      'SH/Registers',
      'ExportContacts',
      {
        exportFilter: typeof filter === 'string' ? filter : filter?.build(),
        context: options.context,
      }
    );
  }

  // ====== BACKWARD COMPATIBILITY ALIASES ======
  
  /**
   * Export Sales Orders (alias for backward compatibility)
   */
  async exportSales(options: {
    dateFrom?: string;
    dateTo?: string;
    customerId?: string;
    context?: RequestContext;
  }): Promise<ExportResponse<FSSalesOrder[]>> {
    return this.exportSalesOrders(options);
  }

  /**
   * Get Stock Levels (alias for backward compatibility)
   */
  async getStockLevels(
    itemCode?: string,
    options: { context?: RequestContext } = {}
  ): Promise<ServiceResponse<FSItemStock[]>> {
    return this.getItemsStock({
      itemCodes: itemCode ? [itemCode] : undefined,
      ...options,
    });
  }

  /**
   * Export Customers (alias for backward compatibility)
   */
  async exportCustomers(options: {
    filter?: string | FilterBuilder;
    active?: boolean;
    context?: RequestContext;
  }): Promise<ExportResponse<FSContact[]>> {
    return this.exportContacts({
      ...options,
      contactType: 'Customer',
    });
  }

  // ====== WRITE OPERATIONS ======

  /**
   * Create a new Sales Order in Fluentis
   */
  async createSalesOrder(data: {
    customerId: string;
    customerName?: string;
    orderDate?: string; // YYYY-MM-DD
    deliveryDate?: string;
    notes?: string;
    items: Array<{
      itemCode: string;
      description?: string;
      quantity: number;
      unitPrice?: number;
      discount?: number;
      vatCode?: string;
    }>;
    context?: RequestContext;
  }): Promise<ImportResponse> {
    const { context, ...orderData } = data;

    // Build Fluentis Sales Order object
    const salesOrder = {
      OrderDate: orderData.orderDate || new Date().toISOString().split('T')[0],
      CustomerId: orderData.customerId,
      CustomerName: orderData.customerName,
      DeliveryDate: orderData.deliveryDate,
      Notes: orderData.notes,
      OrderLines: orderData.items.map((item, index) => ({
        LineNumber: index + 1,
        ItemCode: item.itemCode,
        Description: item.description,
        Quantity: item.quantity,
        UnitPrice: item.unitPrice,
        Discount: item.discount || 0,
        VATCode: item.vatCode || 'STD',
      })),
    };

    return this.import(
      'SD/SalesOrder',
      'ImportSalesOrders',
      salesOrder,
      {
        context,
        updateExisting: false,
        validateOnly: false,
      }
    );
  }

  /**
   * Update an existing Customer in Fluentis
   */
  async updateCustomer(data: {
    customerId: string;
    companyName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    vatNumber?: string;
    active?: boolean;
    context?: RequestContext;
  }): Promise<ImportResponse> {
    const { context, ...customerData } = data;

    // Build Fluentis Contact object
    const customer = {
      ContactCode: customerData.customerId,
      ContactType: 'Customer',
      CompanyName: customerData.companyName,
      Email: customerData.email,
      Phone: customerData.phone,
      Address: customerData.address,
      City: customerData.city,
      Country: customerData.country,
      VATNumber: customerData.vatNumber,
      Active: customerData.active ?? true,
    };

    return this.import(
      'SH/Registers',
      'ImportContacts',
      customer,
      {
        context,
        updateExisting: true, // Update if exists
        validateOnly: false,
      }
    );
  }

  /**
   * Create a new Item in Fluentis
   */
  async createItem(data: {
    itemCode: string;
    description: string;
    category?: string;
    unitPrice?: number;
    cost?: number;
    unitOfMeasure?: string;
    active?: boolean;
    context?: RequestContext;
  }): Promise<ImportResponse> {
    const { context, ...itemData } = data;

    // Build Fluentis Item object
    const item = {
      ItemCode: itemData.itemCode,
      Description: itemData.description,
      Category: itemData.category,
      UnitPrice: itemData.unitPrice,
      Cost: itemData.cost,
      UnitOfMeasure: itemData.unitOfMeasure || 'PZ',
      Active: itemData.active ?? true,
    };

    return this.import(
      'WM/Common',
      'ImportItems',
      item,
      {
        context,
        updateExisting: false,
        validateOnly: false,
      }
    );
  }

  /**
   * Update stock levels for an item (Warehouse Posting)
   */
  async updateStock(data: {
    itemCode: string;
    warehouseCode: string;
    quantity: number;
    movementType: 'in' | 'out' | 'adjustment';
    reason?: string;
    referenceDocument?: string;
    context?: RequestContext;
  }): Promise<OperationResponse> {
    const { context, ...stockData } = data;

    // Build Warehouse Posting operation
    const operation = {
      ItemCode: stockData.itemCode,
      WarehouseCode: stockData.warehouseCode,
      Quantity: stockData.quantity,
      MovementType: stockData.movementType,
      Reason: stockData.reason,
      ReferenceDocument: stockData.referenceDocument,
      PostingDate: new Date().toISOString().split('T')[0],
    };

    return this.operation(
      'WM/Warehouse',
      'PostStockMovement',
      operation,
      { context }
    );
  }

  /**
   * Create a new Customer in Fluentis
   */
  async createCustomer(data: {
    customerId: string;
    companyName: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    vatNumber?: string;
    context?: RequestContext;
  }): Promise<ImportResponse> {
    const { context, ...customerData } = data;

    // Build Fluentis Contact object
    const customer = {
      ContactCode: customerData.customerId,
      ContactType: 'Customer',
      CompanyName: customerData.companyName,
      Email: customerData.email,
      Phone: customerData.phone,
      Address: customerData.address,
      City: customerData.city,
      Country: customerData.country,
      VATNumber: customerData.vatNumber,
      Active: true,
    };

    return this.import(
      'SH/Registers',
      'ImportContacts',
      customer,
      {
        context,
        updateExisting: false,
        validateOnly: false,
      }
    );
  }

  /**
   * Validate data without actually importing (dry-run)
   */
  async validateSalesOrder(data: {
    customerId: string;
    items: Array<{
      itemCode: string;
      quantity: number;
      unitPrice?: number;
    }>;
    context?: RequestContext;
  }): Promise<ImportResponse> {
    const { context, ...orderData } = data;

    const salesOrder = {
      CustomerId: orderData.customerId,
      OrderLines: orderData.items.map((item, index) => ({
        LineNumber: index + 1,
        ItemCode: item.itemCode,
        Quantity: item.quantity,
        UnitPrice: item.unitPrice,
      })),
    };

    return this.import(
      'SD/SalesOrder',
      'ImportSalesOrders',
      salesOrder,
      {
        context,
        validateOnly: true, // Only validate, don't create
      }
    );
  }
}

// Singleton instance
export const fluentisService = new FluentisService();
