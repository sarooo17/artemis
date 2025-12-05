import { 
  WriteAction, 
  WRITE_ACTIONS, 
  getWriteActionById, 
  validateActionPayload 
} from '../config/write-actions-catalog';
import { FluentisService } from './fluentis.service';
import { RequestContext } from '../types/context.types';
import type { z } from 'zod';

/**
 * Write Action Service
 * Handles validation and execution of write operations through Fluentis API
 * All write operations require confirmation and are logged
 */

export interface WriteActionExecutionOptions {
  context: RequestContext;
  validateOnly?: boolean; // Only validate, don't execute
  updateExisting?: boolean; // For updates/upserts
  ignoreWarnings?: boolean; // Ignore Fluentis warnings
}

export interface WriteActionResult {
  success: boolean;
  data?: any;
  error?: string;
  validationErrors?: Array<{
    path: string[];
    message: string;
  }>;
  fluentisResponse?: any;
}

export class WriteActionService {
  private fluentisService: FluentisService;

  constructor() {
    this.fluentisService = new FluentisService();
  }

  /**
   * Execute a write action with validation and Fluentis API call
   */
  async execute(
    actionId: string,
    payload: any,
    options: WriteActionExecutionOptions
  ): Promise<WriteActionResult> {
    try {
      console.log(`🔧 Executing write action: ${actionId}`);
      
      // 1. Get action definition
      const action = getWriteActionById(actionId);
      if (!action) {
        return {
          success: false,
          error: `Unknown action: ${actionId}`,
        };
      }

      // 2. Validate payload against schema
      const validation = validateActionPayload(actionId, payload);
      if (!validation.success) {
        const errors = validation.errors?.errors.map(err => ({
          path: err.path.map(String),
          message: err.message,
        }));
        
        console.warn(`❌ Validation failed for ${actionId}:`, errors);
        
        return {
          success: false,
          error: 'Validation failed',
          validationErrors: errors,
        };
      }

      const validatedData = validation.data;
      
      console.log(`✅ Validation passed for ${actionId}`);

      // 3. If validateOnly, return success without executing
      if (options.validateOnly) {
        return {
          success: true,
          data: validatedData,
        };
      }

      // 4. Map to Fluentis API and execute
      const fluentisResult = await this.executeFluentisAction(action, validatedData, options);

      if (!fluentisResult.Success) {
        console.error(`❌ Fluentis error for ${actionId}:`, fluentisResult.ErrorMessage);
        
        return {
          success: false,
          error: fluentisResult.ErrorMessage || 'Fluentis execution failed',
          fluentisResponse: fluentisResult,
        };
      }

      console.log(`✅ Action ${actionId} executed successfully`);

      return {
        success: true,
        data: fluentisResult.Data,
        fluentisResponse: fluentisResult,
      };

    } catch (error: any) {
      console.error(`❌ Error executing action ${actionId}:`, error);
      
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Map action to Fluentis API call
   */
  private async executeFluentisAction(
    action: WriteAction,
    data: any,
    options: WriteActionExecutionOptions
  ): Promise<any> {
    const { apiId, method } = action.fluentisMapping;

    // Map action IDs to Fluentis controller/method
    const mapping = this.getFluentisEndpoint(apiId);
    
    if (!mapping) {
      throw new Error(`No Fluentis mapping found for API: ${apiId}`);
    }

    const { controller, fluentisMethod } = mapping;

    // Transform data to Fluentis format
    const fluentisData = this.transformToFluentisFormat(action, data);

    // Execute based on method type
    switch (method) {
      case 'import':
        return await this.fluentisService.import(
          controller,
          fluentisMethod,
          fluentisData,
          {
            context: options.context,
            validateOnly: options.validateOnly,
            updateExisting: options.updateExisting,
            ignoreWarnings: options.ignoreWarnings,
          }
        );

      case 'service':
        return await this.fluentisService.service(
          controller,
          fluentisMethod,
          fluentisData,
          {
            context: options.context,
            cache: { enabled: false }, // Never cache write operations
          }
        );

      case 'operation':
        return await this.fluentisService.operation(
          controller,
          fluentisMethod,
          fluentisData,
          {
            context: options.context,
          }
        );

      default:
        throw new Error(`Unsupported method type: ${method}`);
    }
  }

  /**
   * Map API ID to Fluentis controller and method
   * Based on FLUENTIS_API_CATALOG structure
   */
  private getFluentisEndpoint(apiId: string): { 
    controller: string; 
    fluentisMethod: string;
  } | null {
    // Mapping from API catalog IDs to Fluentis endpoints
    const mappings: Record<string, { controller: string; fluentisMethod: string }> = {
      // Sales
      'import_sales_orders': { 
        controller: 'SD/SalesOrders', 
        fluentisMethod: 'Import' 
      },
      'import_contacts': { 
        controller: 'SH/Contacts', 
        fluentisMethod: 'Import' 
      },
      
      // Supply Chain
      'import_purchase_orders': { 
        controller: 'Scm/PurchaseOrders', 
        fluentisMethod: 'Import' 
      },
      
      // Warehouse
      'import_items': { 
        controller: 'WM/Items', 
        fluentisMethod: 'Import' 
      },
      'import_warehouse_postings': { 
        controller: 'WM/WarehousePostings', 
        fluentisMethod: 'Import' 
      },
      
      // Finance
      'import_payments': { 
        controller: 'FI/Payments', 
        fluentisMethod: 'Import' 
      },
    };

    return mappings[apiId] || null;
  }

  /**
   * Transform validated data to Fluentis format
   * Each action may need specific field mapping
   */
  private transformToFluentisFormat(action: WriteAction, data: any): any {
    // Basic transformation - extend based on specific Fluentis requirements
    
    switch (action.id) {
      case 'create_sales_order':
        return this.transformSalesOrder(data);
      
      case 'create_customer':
      case 'update_customer':
        return this.transformCustomer(data);
      
      case 'create_purchase_order':
        return this.transformPurchaseOrder(data);
      
      case 'create_item':
        return this.transformItem(data);
      
      case 'update_stock':
        return this.transformStockMovement(data);
      
      case 'create_payment':
        return this.transformPayment(data);
      
      default:
        // Default: return as-is
        return data;
    }
  }

  /**
   * Transform sales order data to Fluentis format
   */
  private transformSalesOrder(data: any): any {
    return {
      CustomerCode: data.customerId,
      OrderDate: data.orderDate || new Date().toISOString().split('T')[0],
      DeliveryDate: data.deliveryDate,
      Notes: data.notes,
      PaymentTerms: data.paymentTerms,
      ShippingAddress: data.shippingAddress,
      Lines: data.items.map((item: any, index: number) => ({
        LineNumber: index + 1,
        ItemCode: item.itemId,
        Quantity: item.quantity,
        UnitPrice: item.unitPrice,
        Discount: item.discount || 0,
        Notes: item.notes,
      })),
    };
  }

  /**
   * Transform customer data to Fluentis format
   */
  private transformCustomer(data: any): any {
    // For update, extract only the changed fields
    if (data.updates) {
      return {
        CustomerCode: data.customerId,
        ...data.updates,
      };
    }

    // For create
    return {
      CustomerCode: data.code,
      CompanyName: data.name,
      VATNumber: data.vatNumber,
      FiscalCode: data.fiscalCode,
      Address: data.address,
      City: data.city,
      PostalCode: data.postalCode,
      Province: data.province,
      Country: data.country || 'IT',
      Email: data.email,
      Phone: data.phone,
      PEC: data.pec,
      SDI: data.sdi,
      PaymentTerms: data.paymentTerms,
      PriceList: data.priceList,
      Notes: data.notes,
    };
  }

  /**
   * Transform purchase order data to Fluentis format
   */
  private transformPurchaseOrder(data: any): any {
    return {
      SupplierCode: data.supplierId,
      OrderDate: data.orderDate || new Date().toISOString().split('T')[0],
      DeliveryDate: data.deliveryDate,
      Notes: data.notes,
      DeliveryAddress: data.deliveryAddress,
      Lines: data.items.map((item: any, index: number) => ({
        LineNumber: index + 1,
        ItemCode: item.itemId,
        Quantity: item.quantity,
        UnitPrice: item.unitPrice,
        Notes: item.notes,
      })),
    };
  }

  /**
   * Transform item data to Fluentis format
   */
  private transformItem(data: any): any {
    return {
      ItemCode: data.code,
      Description: data.description,
      ItemType: data.type,
      UnitOfMeasure: data.unit || 'PZ',
      Category: data.category,
      VATRate: data.vatRate,
      StandardCost: data.standardCost,
      SalesPrice: data.salesPrice,
      MinStock: data.minStock,
      MaxStock: data.maxStock,
      ReorderPoint: data.reorderPoint,
      Notes: data.notes,
    };
  }

  /**
   * Transform stock movement data to Fluentis format
   */
  private transformStockMovement(data: any): any {
    return {
      ItemCode: data.itemId,
      WarehouseCode: data.warehouse,
      Quantity: data.quantity,
      MovementType: data.movementType,
      Reason: data.reason,
      Reference: data.reference,
      MovementDate: data.date || new Date().toISOString().split('T')[0],
      Notes: data.notes,
    };
  }

  /**
   * Transform payment data to Fluentis format
   */
  private transformPayment(data: any): any {
    return {
      CustomerCode: data.customerId,
      SupplierCode: data.supplierId,
      Amount: data.amount,
      PaymentDate: data.paymentDate,
      PaymentMethod: data.paymentMethod,
      InvoiceReference: data.invoiceReference,
      Notes: data.notes,
    };
  }

  /**
   * Get all available write actions
   */
  getAvailableActions(): WriteAction[] {
    return WRITE_ACTIONS;
  }

  /**
   * Get actions by area
   */
  getActionsByArea(area: WriteAction['area']): WriteAction[] {
    return WRITE_ACTIONS.filter(action => action.area === area);
  }
}

// Singleton export
export const writeActionService = new WriteActionService();
