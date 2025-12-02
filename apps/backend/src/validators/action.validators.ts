import { z } from 'zod';

/**
 * Action Validation Schemas
 * Zod schemas for validating action payloads before execution
 */

// ====== SALES ORDER ACTIONS ======

export const CreateSalesOrderSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  customerName: z.string().optional(),
  orderDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  notes: z.string().max(1000, 'Notes too long').optional(),
  items: z.array(
    z.object({
      itemCode: z.string().min(1, 'Item code is required'),
      description: z.string().optional(),
      quantity: z.number().positive('Quantity must be positive'),
      unitPrice: z.number().nonnegative('Unit price cannot be negative').optional(),
      discount: z.number().min(0).max(100, 'Discount must be between 0-100%').optional(),
      vatCode: z.string().optional(),
    })
  ).min(1, 'At least one item is required'),
});

export const ValidateSalesOrderSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  items: z.array(
    z.object({
      itemCode: z.string().min(1, 'Item code is required'),
      quantity: z.number().positive('Quantity must be positive'),
      unitPrice: z.number().nonnegative('Unit price cannot be negative').optional(),
    })
  ).min(1, 'At least one item is required'),
});

// ====== CUSTOMER ACTIONS ======

export const CreateCustomerSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  companyName: z.string().min(1, 'Company name is required'),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  vatNumber: z.string().optional(),
});

export const UpdateCustomerSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  companyName: z.string().min(1, 'Company name is required').optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  vatNumber: z.string().optional(),
  active: z.boolean().optional(),
});

// ====== ITEM ACTIONS ======

export const CreateItemSchema = z.object({
  itemCode: z.string().min(1, 'Item code is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().optional(),
  unitPrice: z.number().nonnegative('Unit price cannot be negative').optional(),
  cost: z.number().nonnegative('Cost cannot be negative').optional(),
  unitOfMeasure: z.string().optional(),
  active: z.boolean().optional(),
});

export const UpdateItemSchema = z.object({
  itemCode: z.string().min(1, 'Item code is required'),
  description: z.string().min(1, 'Description is required').optional(),
  category: z.string().optional(),
  unitPrice: z.number().nonnegative('Unit price cannot be negative').optional(),
  cost: z.number().nonnegative('Cost cannot be negative').optional(),
  unitOfMeasure: z.string().optional(),
  active: z.boolean().optional(),
});

// ====== STOCK ACTIONS ======

export const UpdateStockSchema = z.object({
  itemCode: z.string().min(1, 'Item code is required'),
  warehouseCode: z.string().min(1, 'Warehouse code is required'),
  quantity: z.number().refine((val) => val !== 0, 'Quantity cannot be zero'),
  movementType: z.enum(['in', 'out', 'adjustment']),
  reason: z.string().max(500, 'Reason too long').optional(),
  referenceDocument: z.string().optional(),
});

// ====== ACTION PAYLOAD WRAPPER ======

export const ExecuteActionSchema = z.object({
  actionType: z.enum([
    'create_sales_order',
    'validate_sales_order',
    'create_customer',
    'update_customer',
    'create_item',
    'update_item',
    'update_stock',
  ]),
  payload: z.record(z.any()), // Validated based on actionType
  sessionId: z.string().optional(), // Link to chat session
  confirmationRequired: z.boolean().default(false),
});

// Type exports
export type CreateSalesOrderInput = z.infer<typeof CreateSalesOrderSchema>;
export type ValidateSalesOrderInput = z.infer<typeof ValidateSalesOrderSchema>;
export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;
export type CreateItemInput = z.infer<typeof CreateItemSchema>;
export type UpdateItemInput = z.infer<typeof UpdateItemSchema>;
export type UpdateStockInput = z.infer<typeof UpdateStockSchema>;
export type ExecuteActionInput = z.infer<typeof ExecuteActionSchema>;

/**
 * Validate action payload based on action type
 */
export function validateActionPayload(actionType: string, payload: any): any {
  switch (actionType) {
    case 'create_sales_order':
      return CreateSalesOrderSchema.parse(payload);
    case 'validate_sales_order':
      return ValidateSalesOrderSchema.parse(payload);
    case 'create_customer':
      return CreateCustomerSchema.parse(payload);
    case 'update_customer':
      return UpdateCustomerSchema.parse(payload);
    case 'create_item':
      return CreateItemSchema.parse(payload);
    case 'update_item':
      return UpdateItemSchema.parse(payload);
    case 'update_stock':
      return UpdateStockSchema.parse(payload);
    default:
      throw new Error(`Unknown action type: ${actionType}`);
  }
}
