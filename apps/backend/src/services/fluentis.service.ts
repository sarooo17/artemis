import axios, { AxiosInstance } from 'axios';
import { env } from '../config/env';

/**
 * Fluentis WebAPI Service
 * Handles communication with Fluentis ERP system
 */

interface FluentisAuth {
  username: string;
  password: string;
}

interface FluentisRequestBase {
  CompanyId?: number;
  CompanyCode?: string;
  DepartmentId?: number;
  DepartmentCode?: string;
  Format: 0 | 1; // 0 = XML, 1 = JSON
  FluentisFormat?: string;
}

interface ExportRequest extends FluentisRequestBase {
  ObjectsToExport?: Array<{ Id: number }>;
  ExportFilter?: string;
}

interface ImportRequest extends FluentisRequestBase {
  BinaryContent: string; // Base64 encoded
}

interface FluentisResponse {
  Success: boolean;
  Details?: string;
  ErrorMessage?: string;
  Data?: any;
}

export class FluentisService {
  private client: AxiosInstance;
  private auth: FluentisAuth;
  private mockMode: boolean;

  constructor() {
    this.mockMode = env.FLUENTIS_MOCK_MODE;
    
    this.auth = {
      username: env.FLUENTIS_USER,
      password: env.FLUENTIS_PASSWORD,
    };

    this.client = axios.create({
      baseURL: env.FLUENTIS_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${this.auth.username}:${this.auth.password}`).toString('base64')}`,
      },
      timeout: 30000, // 30 seconds
    });
    
    if (this.mockMode) {
      console.log('🎭 FluentisService running in MOCK MODE');
    }

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
        throw error;
      }
    );
  }

  /**
   * Export data from Fluentis
   */
  async export(
    controller: string,
    method: string,
    options: {
      exportFilter?: string;
      objectsToExport?: Array<{ Id: number }>;
      fluentisFormat?: string;
      companyCode?: string;
      departmentCode?: string;
    } = {}
  ): Promise<any> {
    const request: ExportRequest = {
      Format: 1, // JSON
      CompanyCode: options.companyCode || env.FLUENTIS_COMPANY_CODE,
      DepartmentCode: options.departmentCode || env.FLUENTIS_DEPARTMENT_CODE,
      FluentisFormat: options.fluentisFormat,
      ExportFilter: options.exportFilter,
      ObjectsToExport: options.objectsToExport,
    };

    const endpoint = `/${controller}/${method}`;
    
    try {
      const response = await this.client.post<FluentisResponse>(endpoint, request);
      
      if (!response.data.Success) {
        throw new Error(response.data.ErrorMessage || 'Fluentis export failed');
      }

      return response.data.Data;
    } catch (error: any) {
      console.error(`Fluentis export error (${controller}/${method}):`, error.message);
      throw new Error(`Failed to export from Fluentis: ${error.message}`);
    }
  }

  /**
   * Import data to Fluentis
   */
  async import(
    controller: string,
    method: string,
    data: any,
    options: {
      fluentisFormat?: string;
      companyCode?: string;
      departmentCode?: string;
    } = {}
  ): Promise<FluentisResponse> {
    // Convert data to XML or JSON string
    const dataString = JSON.stringify(data);
    const binaryContent = Buffer.from(dataString).toString('base64');

    const request: ImportRequest = {
      Format: 1, // JSON
      CompanyCode: options.companyCode || env.FLUENTIS_COMPANY_CODE,
      DepartmentCode: options.departmentCode || env.FLUENTIS_DEPARTMENT_CODE,
      FluentisFormat: options.fluentisFormat,
      BinaryContent: binaryContent,
    };

    const endpoint = `/${controller}/${method}`;

    try {
      const response = await this.client.post<FluentisResponse>(endpoint, request);
      
      if (!response.data.Success) {
        throw new Error(response.data.ErrorMessage || 'Fluentis import failed');
      }

      return response.data;
    } catch (error: any) {
      console.error(`Fluentis import error (${controller}/${method}):`, error.message);
      throw new Error(`Failed to import to Fluentis: ${error.message}`);
    }
  }

  /**
   * Execute a service call (read-only)
   */
  async service(
    controller: string,
    method: string,
    params: Record<string, any> = {},
    options: {
      companyCode?: string;
      departmentCode?: string;
    } = {}
  ): Promise<any> {
    const request = {
      ...params,
      CompanyCode: options.companyCode || env.FLUENTIS_COMPANY_CODE,
      DepartmentCode: options.departmentCode || env.FLUENTIS_DEPARTMENT_CODE,
    };

    const endpoint = `/${controller}/${method}`;

    try {
      const response = await this.client.post<FluentisResponse>(endpoint, request);
      
      if (!response.data.Success) {
        throw new Error(response.data.ErrorMessage || 'Fluentis service call failed');
      }

      return response.data.Data;
    } catch (error: any) {
      console.error(`Fluentis service error (${controller}/${method}):`, error.message);
      throw new Error(`Failed to call Fluentis service: ${error.message}`);
    }
  }

  /**
   * Execute an operation (read-write)
   */
  async operation(
    controller: string,
    method: string,
    params: Record<string, any> = {},
    options: {
      companyCode?: string;
      departmentCode?: string;
    } = {}
  ): Promise<FluentisResponse> {
    const request = {
      ...params,
      CompanyCode: options.companyCode || env.FLUENTIS_COMPANY_CODE,
      DepartmentCode: options.departmentCode || env.FLUENTIS_DEPARTMENT_CODE,
    };

    const endpoint = `/${controller}/${method}`;

    try {
      const response = await this.client.post<FluentisResponse>(endpoint, request);
      
      if (!response.data.Success) {
        throw new Error(response.data.ErrorMessage || 'Fluentis operation failed');
      }

      return response.data;
    } catch (error: any) {
      console.error(`Fluentis operation error (${controller}/${method}):`, error.message);
      throw new Error(`Failed to execute Fluentis operation: ${error.message}`);
    }
  }

  // ====== MOCK DATA ======
  
  private generateMockSalesData(options: { dateFrom?: string; dateTo?: string; customerId?: string }): any {
    const baseDate = options.dateFrom ? new Date(options.dateFrom) : new Date('2025-03-01');
    
    return [
      {
        OrderId: 'ORD-2025-001',
        OrderNumber: 'SO001',
        Date: baseDate.toISOString().split('T')[0],
        CustomerId: 'CUST001',
        CustomerName: 'Acme Corporation',
        TotalAmount: 15420.50,
        Currency: 'EUR',
        Status: 'Confirmed',
        Items: [
          { ItemCode: 'PROD-A', Description: 'Product A', Quantity: 10, UnitPrice: 1250.00, Total: 12500.00 },
          { ItemCode: 'PROD-B', Description: 'Product B', Quantity: 15, UnitPrice: 194.70, Total: 2920.50 },
        ],
      },
      {
        OrderId: 'ORD-2025-002',
        OrderNumber: 'SO002',
        Date: new Date(baseDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        CustomerId: 'CUST002',
        CustomerName: 'TechStart Industries',
        TotalAmount: 8750.00,
        Currency: 'EUR',
        Status: 'Confirmed',
        Items: [
          { ItemCode: 'PROD-C', Description: 'Product C', Quantity: 25, UnitPrice: 350.00, Total: 8750.00 },
        ],
      },
      {
        OrderId: 'ORD-2025-003',
        OrderNumber: 'SO003',
        Date: new Date(baseDate.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        CustomerId: 'CUST003',
        CustomerName: 'Global Solutions Ltd',
        TotalAmount: 32100.00,
        Currency: 'EUR',
        Status: 'Pending',
        Items: [
          { ItemCode: 'PROD-A', Description: 'Product A', Quantity: 20, UnitPrice: 1250.00, Total: 25000.00 },
          { ItemCode: 'PROD-D', Description: 'Product D', Quantity: 10, UnitPrice: 710.00, Total: 7100.00 },
        ],
      },
      {
        OrderId: 'ORD-2025-004',
        OrderNumber: 'SO004',
        Date: new Date(baseDate.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        CustomerId: 'CUST001',
        CustomerName: 'Acme Corporation',
        TotalAmount: 5890.00,
        Currency: 'EUR',
        Status: 'Confirmed',
        Items: [
          { ItemCode: 'PROD-B', Description: 'Product B', Quantity: 30, UnitPrice: 196.33, Total: 5890.00 },
        ],
      },
    ];
  }

  private generateMockStockData(itemCode?: string): any {
    const allStock = [
      {
        ItemCode: 'PROD-A',
        Description: 'Product A - Premium Widget',
        Category: 'Electronics',
        AvailableQuantity: 150,
        ReservedQuantity: 30,
        OnOrderQuantity: 200,
        UnitPrice: 1250.00,
        LastRestockDate: '2025-02-15',
        Warehouse: 'Main Warehouse',
      },
      {
        ItemCode: 'PROD-B',
        Description: 'Product B - Standard Component',
        Category: 'Components',
        AvailableQuantity: 450,
        ReservedQuantity: 45,
        OnOrderQuantity: 0,
        UnitPrice: 194.70,
        LastRestockDate: '2025-02-20',
        Warehouse: 'Main Warehouse',
      },
      {
        ItemCode: 'PROD-C',
        Description: 'Product C - Essential Tool',
        Category: 'Tools',
        AvailableQuantity: 75,
        ReservedQuantity: 25,
        OnOrderQuantity: 100,
        UnitPrice: 350.00,
        LastRestockDate: '2025-02-10',
        Warehouse: 'Main Warehouse',
      },
      {
        ItemCode: 'PROD-D',
        Description: 'Product D - Professional Kit',
        Category: 'Kits',
        AvailableQuantity: 30,
        ReservedQuantity: 10,
        OnOrderQuantity: 50,
        UnitPrice: 710.00,
        LastRestockDate: '2025-02-18',
        Warehouse: 'Secondary Warehouse',
      },
    ];

    return itemCode ? allStock.filter(item => item.ItemCode === itemCode) : allStock;
  }

  private generateMockItemsData(): any {
    return [
      {
        ItemCode: 'PROD-A',
        Description: 'Product A - Premium Widget',
        Category: 'Electronics',
        UnitPrice: 1250.00,
        Cost: 875.00,
        Active: true,
        Supplier: 'Premium Suppliers Inc',
        LeadTimeDays: 15,
      },
      {
        ItemCode: 'PROD-B',
        Description: 'Product B - Standard Component',
        Category: 'Components',
        UnitPrice: 194.70,
        Cost: 136.29,
        Active: true,
        Supplier: 'Components Co',
        LeadTimeDays: 7,
      },
      {
        ItemCode: 'PROD-C',
        Description: 'Product C - Essential Tool',
        Category: 'Tools',
        UnitPrice: 350.00,
        Cost: 245.00,
        Active: true,
        Supplier: 'Tool Masters Ltd',
        LeadTimeDays: 10,
      },
      {
        ItemCode: 'PROD-D',
        Description: 'Product D - Professional Kit',
        Category: 'Kits',
        UnitPrice: 710.00,
        Cost: 497.00,
        Active: true,
        Supplier: 'Premium Suppliers Inc',
        LeadTimeDays: 20,
      },
    ];
  }

  private generateMockCustomersData(): any {
    return [
      {
        CustomerId: 'CUST001',
        Name: 'Acme Corporation',
        Email: 'contact@acme-corp.com',
        Phone: '+39 02 1234567',
        Address: 'Via Roma 123, Milano',
        Country: 'Italy',
        TotalOrders: 156,
        TotalRevenue: 234500.00,
        CreditLimit: 50000.00,
        PaymentTerms: '30 days',
      },
      {
        CustomerId: 'CUST002',
        Name: 'TechStart Industries',
        Email: 'info@techstart.com',
        Phone: '+39 06 9876543',
        Address: 'Via Nazionale 45, Roma',
        Country: 'Italy',
        TotalOrders: 89,
        TotalRevenue: 145600.00,
        CreditLimit: 30000.00,
        PaymentTerms: '60 days',
      },
      {
        CustomerId: 'CUST003',
        Name: 'Global Solutions Ltd',
        Email: 'sales@globalsolutions.com',
        Phone: '+44 20 7123456',
        Address: '10 Downing Street, London',
        Country: 'United Kingdom',
        TotalOrders: 234,
        TotalRevenue: 567800.00,
        CreditLimit: 100000.00,
        PaymentTerms: '30 days',
      },
    ];
  }

  // ====== SPECIFIC METHODS (Examples) ======

  /**
   * Export sales data
   */
  async exportSales(options: {
    dateFrom?: string;
    dateTo?: string;
    customerId?: string;
  } = {}): Promise<any> {
    if (this.mockMode) {
      console.log('📊 Mock: Exporting sales data', options);
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
      return this.generateMockSalesData(options);
    }

    let filter = '';
    
    if (options.dateFrom && options.dateTo) {
      filter = `[Date] >= #!${options.dateFrom}!# AND [Date] <= #!${options.dateTo}!#`;
    }
    
    if (options.customerId) {
      filter += filter ? ` AND [CustomerId] == '${options.customerId}'` : `[CustomerId] == '${options.customerId}'`;
    }

    return this.export('Sales', 'ExportSalesOrders', {
      exportFilter: filter || undefined,
    });
  }

  /**
   * Get stock/inventory levels
   */
  async getStockLevels(itemCode?: string): Promise<any> {
    if (this.mockMode) {
      console.log('📦 Mock: Getting stock levels', { itemCode });
      await new Promise(resolve => setTimeout(resolve, 400)); // Simulate API delay
      return this.generateMockStockData(itemCode);
    }

    return this.service('Warehouse', 'GetStockSummary', {
      ItemCode: itemCode,
    });
  }

  /**
   * Export items/products
   */
  async exportItems(filter?: string): Promise<any> {
    if (this.mockMode) {
      console.log('🏷️  Mock: Exporting items', { filter });
      await new Promise(resolve => setTimeout(resolve, 350)); // Simulate API delay
      return this.generateMockItemsData();
    }

    return this.export('Items', 'ExportItems', {
      exportFilter: filter,
    });
  }

  /**
   * Export customers
   */
  async exportCustomers(filter?: string): Promise<any> {
    if (this.mockMode) {
      console.log('👥 Mock: Exporting customers', { filter });
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API delay
      return this.generateMockCustomersData();
    }

    return this.export('Customers', 'ExportCustomers', {
      exportFilter: filter,
    });
  }
}

// Singleton instance
export const fluentisService = new FluentisService();
