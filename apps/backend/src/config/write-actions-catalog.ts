import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Write Actions Catalog
 * Defines all write operations that can be performed through conversational interface
 * Each action has a zod schema for validation and C1 form generation
 * 
 * Actions are passed to OpenAI for intent detection and to C1 for form generation
 * Schemas are converted to JSON Schema for C1 metadata.thesys.c1_custom_actions
 */

export interface WriteAction {
  id: string;
  name: string;
  description: string;
  area: 'SD' | 'SCM' | 'WM' | 'FI' | 'SH'; // Sales, Supply Chain, Warehouse, Finance, Shared
  requiresConfirmation: boolean;
  schema: z.ZodObject<any>;
  fluentisMapping: {
    apiId: string; // Riferimento a FLUENTIS_API_CATALOG
    method: 'import' | 'service' | 'operation';
  };
  prefillSources?: string[]; // Entities to fetch for prefill
  examples: string[];
}

// ========== SALES (SD) AREA ==========

const createSalesOrderSchema = z.object({
  customerId: z.string().describe('Customer ID or code'),
  customerName: z.string().optional().describe('Customer name (auto-filled if known)'),
  orderDate: z.string().optional().describe('Order date (defaults to today)'),
  deliveryDate: z.string().optional().describe('Requested delivery date'),
  items: z.array(
    z.object({
      itemId: z.string().describe('Item ID or code'),
      itemDescription: z.string().optional().describe('Item description (auto-filled)'),
      quantity: z.number().positive().describe('Order quantity'),
      unitPrice: z.number().optional().describe('Unit price (auto-filled from price list)'),
      discount: z.number().min(0).max(100).optional().describe('Discount percentage'),
      notes: z.string().optional().describe('Line item notes'),
    })
  ).min(1).describe('Order line items'),
  notes: z.string().optional().describe('Order header notes'),
  paymentTerms: z.string().optional().describe('Payment terms code'),
  shippingAddress: z.string().optional().describe('Shipping address'),
});

const createCustomerSchema = z.object({
  code: z.string().optional().describe('Customer code (auto-generated if empty)'),
  name: z.string().min(2).describe('Customer business name'),
  vatNumber: z.string().optional().describe('VAT number / Tax ID'),
  fiscalCode: z.string().optional().describe('Fiscal code (for individuals)'),
  address: z.string().describe('Street address'),
  city: z.string().describe('City'),
  postalCode: z.string().describe('Postal code'),
  province: z.string().optional().describe('Province / State'),
  country: z.string().default('IT').describe('Country code (ISO)'),
  email: z.string().email().optional().describe('Primary email'),
  phone: z.string().optional().describe('Primary phone'),
  pec: z.string().optional().describe('Certified email (PEC)'),
  sdi: z.string().optional().describe('SDI code for electronic invoicing'),
  paymentTerms: z.string().optional().describe('Default payment terms'),
  priceList: z.string().optional().describe('Default price list'),
  notes: z.string().optional().describe('Customer notes'),
});

const updateCustomerSchema = z.object({
  customerId: z.string().describe('Customer ID to update'),
  updates: z.object({
    name: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    postalCode: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    paymentTerms: z.string().optional(),
    notes: z.string().optional(),
  }).describe('Fields to update'),
});

// ========== SUPPLY CHAIN (SCM) AREA ==========

const createPurchaseOrderSchema = z.object({
  supplierId: z.string().describe('Supplier ID or code'),
  supplierName: z.string().optional().describe('Supplier name (auto-filled)'),
  orderDate: z.string().optional().describe('Order date (defaults to today)'),
  deliveryDate: z.string().optional().describe('Expected delivery date'),
  items: z.array(
    z.object({
      itemId: z.string().describe('Item ID or code'),
      itemDescription: z.string().optional().describe('Item description (auto-filled)'),
      quantity: z.number().positive().describe('Order quantity'),
      unitPrice: z.number().optional().describe('Unit price'),
      notes: z.string().optional().describe('Line item notes'),
    })
  ).min(1).describe('Purchase order line items'),
  notes: z.string().optional().describe('Order header notes'),
  deliveryAddress: z.string().optional().describe('Delivery warehouse'),
});

// ========== WAREHOUSE (WM) AREA ==========

const createItemSchema = z.object({
  code: z.string().optional().describe('Item code (auto-generated if empty)'),
  description: z.string().min(3).describe('Item description'),
  type: z.enum(['FIN', 'RAW', 'SEM', 'SRV']).describe('Item type: FIN=Finished, RAW=Raw Material, SEM=Semi-finished, SRV=Service'),
  unit: z.string().default('PZ').describe('Unit of measure (e.g., PZ, KG, M)'),
  category: z.string().optional().describe('Item category'),
  vatRate: z.number().optional().describe('VAT rate percentage'),
  standardCost: z.number().optional().describe('Standard cost'),
  salesPrice: z.number().optional().describe('Default sales price'),
  minStock: z.number().optional().describe('Minimum stock level'),
  maxStock: z.number().optional().describe('Maximum stock level'),
  reorderPoint: z.number().optional().describe('Reorder point'),
  notes: z.string().optional().describe('Item notes'),
});

const updateStockSchema = z.object({
  itemId: z.string().describe('Item ID or code'),
  warehouse: z.string().describe('Warehouse code'),
  quantity: z.number().describe('Quantity to add (positive) or subtract (negative)'),
  movementType: z.enum(['LOAD', 'UNLOAD', 'ADJUSTMENT']).describe('Type of stock movement'),
  reason: z.string().optional().describe('Reason for stock adjustment'),
  reference: z.string().optional().describe('Reference document'),
  date: z.string().optional().describe('Movement date (defaults to today)'),
  notes: z.string().optional().describe('Movement notes'),
});

// ========== FINANCE (FI) AREA ==========

const createPaymentSchema = z.object({
  customerId: z.string().optional().describe('Customer ID (for receivables)'),
  supplierId: z.string().optional().describe('Supplier ID (for payables)'),
  amount: z.number().positive().describe('Payment amount'),
  paymentDate: z.string().describe('Payment date'),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CHECK', 'CREDIT_CARD', 'OTHER']).describe('Payment method'),
  invoiceReference: z.string().optional().describe('Invoice number reference'),
  notes: z.string().optional().describe('Payment notes'),
});

// ========== CATALOG EXPORT ==========

export const WRITE_ACTIONS: WriteAction[] = [
  // SALES
  {
    id: 'create_sales_order',
    name: 'create_sales_order',
    description: 'Create a new sales order for a customer',
    area: 'SD',
    requiresConfirmation: true,
    schema: createSalesOrderSchema,
    fluentisMapping: {
      apiId: 'import_sales_orders',
      method: 'import',
    },
    prefillSources: ['customer', 'items', 'pricelist'],
    examples: [
      'Create an order for customer ABC',
      'New sales order for XYZ with 10 units of item 123',
      'Create order: customer ABC, item A01 qty 5, item B02 qty 10',
    ],
  },
  {
    id: 'create_customer',
    name: 'create_customer',
    description: 'Create a new customer account',
    area: 'SD',
    requiresConfirmation: true,
    schema: createCustomerSchema,
    fluentisMapping: {
      apiId: 'import_contacts', // Assuming contacts include customers
      method: 'import',
    },
    examples: [
      'Create new customer Acme Corp',
      'Add customer: name "Rossi SRL", address "Via Roma 1", city "Milano"',
      'Register new customer with email info@example.com',
    ],
  },
  {
    id: 'update_customer',
    name: 'update_customer',
    description: 'Update existing customer information',
    area: 'SD',
    requiresConfirmation: true,
    schema: updateCustomerSchema,
    fluentisMapping: {
      apiId: 'import_contacts',
      method: 'import',
    },
    prefillSources: ['customer'],
    examples: [
      'Update customer ABC address',
      'Change phone number for customer XYZ',
      'Update email for Rossi SRL',
    ],
  },

  // SUPPLY CHAIN
  {
    id: 'create_purchase_order',
    name: 'create_purchase_order',
    description: 'Create a new purchase order to a supplier',
    area: 'SCM',
    requiresConfirmation: true,
    schema: createPurchaseOrderSchema,
    fluentisMapping: {
      apiId: 'import_purchase_orders',
      method: 'import',
    },
    prefillSources: ['supplier', 'items'],
    examples: [
      'Create purchase order for supplier DEF',
      'Order 100 units of item RAW123 from supplier XYZ',
      'New PO: supplier ABC, item X qty 50',
    ],
  },

  // WAREHOUSE
  {
    id: 'create_item',
    name: 'create_item',
    description: 'Create a new item in the catalog',
    area: 'WM',
    requiresConfirmation: true,
    schema: createItemSchema,
    fluentisMapping: {
      apiId: 'import_items',
      method: 'import',
    },
    examples: [
      'Create new item "Smartphone X"',
      'Add finished product with code FIN001',
      'Register new raw material item',
    ],
  },
  {
    id: 'update_stock',
    name: 'update_stock',
    description: 'Adjust stock levels for an item in a warehouse',
    area: 'WM',
    requiresConfirmation: true,
    schema: updateStockSchema,
    fluentisMapping: {
      apiId: 'import_warehouse_postings',
      method: 'import',
    },
    prefillSources: ['item', 'warehouse'],
    examples: [
      'Add 50 units of item A01 to warehouse WH1',
      'Remove 10 units from stock',
      'Adjust inventory for item X in warehouse Y',
    ],
  },

  // FINANCE
  {
    id: 'create_payment',
    name: 'create_payment',
    description: 'Register a payment received or made',
    area: 'FI',
    requiresConfirmation: true,
    schema: createPaymentSchema,
    fluentisMapping: {
      apiId: 'import_payments', // Assuming this exists in Fluentis API
      method: 'import',
    },
    prefillSources: ['customer', 'supplier', 'invoice'],
    examples: [
      'Register payment of 1000€ from customer ABC',
      'Record bank transfer to supplier XYZ',
      'Payment received for invoice INV-123',
    ],
  },
];

// ========== HELPER FUNCTIONS ==========

/**
 * Get action by ID
 */
export function getWriteActionById(actionId: string): WriteAction | undefined {
  return WRITE_ACTIONS.find(action => action.id === actionId);
}

/**
 * Get action by name (for C1 custom actions)
 */
export function getWriteActionByName(name: string): WriteAction | undefined {
  return WRITE_ACTIONS.find(action => action.name === name);
}

/**
 * Convert action schema to JSON Schema for C1
 */
export function actionSchemaToJson(action: WriteAction) {
  return zodToJsonSchema(action.schema, {
    name: action.name,
    $refStrategy: 'none',
  });
}

/**
 * Get all actions as JSON Schema for C1 metadata
 */
export function getAllActionsAsJsonSchema() {
  return WRITE_ACTIONS.map(action => ({
    name: action.name,
    description: action.description,
    parameters: zodToJsonSchema(action.schema, {
      name: action.name,
      $refStrategy: 'none',
    }),
  }));
}

/**
 * Get actions by area
 */
export function getActionsByArea(area: WriteAction['area']): WriteAction[] {
  return WRITE_ACTIONS.filter(action => action.area === area);
}

/**
 * Validate payload against action schema
 */
export function validateActionPayload(actionId: string, payload: any): { 
  success: boolean; 
  data?: any; 
  errors?: z.ZodError; 
} {
  const action = getWriteActionById(actionId);
  if (!action) {
    return { success: false, errors: undefined };
  }

  const result = action.schema.safeParse(payload);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}
