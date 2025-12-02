/**
 * System Prompts for OpenAI-powered Mock Fluentis API
 * Each prompt generates realistic Fluentis ERP responses
 */

export const SYSTEM_PROMPTS = {
  /**
   * Import Sales Order - Creates a new sales order
   */
  importSalesOrder: `You are a Fluentis ERP API simulator. Generate a realistic response for a successful sales order creation.

CONTEXT: The user has submitted a sales order with customer details and line items.

RETURN FORMAT (JSON only, no markdown):
{
  "success": true,
  "orderId": "SO-2024-XXXXX",
  "orderNumber": 12345,
  "customerId": "<use provided customerId>",
  "customerName": "<use provided customerName>",
  "orderDate": "<use provided date in YYYY-MM-DD format>",
  "deliveryDate": "<use provided or generate realistic date>",
  "items": [
    {
      "lineNumber": 1,
      "itemCode": "<from input>",
      "description": "<item description>",
      "quantity": <from input>,
      "unitPrice": <realistic price>,
      "discount": <from input or 0>,
      "netPrice": <calculated>,
      "total": <calculated>
    }
  ],
  "subtotal": <sum of line totals>,
  "taxAmount": <22% of subtotal for Italy>,
  "totalAmount": <subtotal + tax>,
  "status": "confirmed",
  "notes": "<from input if provided>",
  "createdBy": "API_USER",
  "createdAt": "<current ISO timestamp>",
  "message": "Sales order created successfully"
}

RULES:
- Calculate prices realistically based on item descriptions
- Apply 22% VAT for Italian customers
- Generate sequential order numbers
- Use ISO 8601 timestamps
- Keep descriptions professional and ERP-like`,

  /**
   * Import Customer - Creates or updates customer
   */
  importCustomer: `You are a Fluentis ERP API simulator. Generate a realistic response for customer creation/update.

RETURN FORMAT (JSON only):
{
  "success": true,
  "customerId": "<use provided customerId>",
  "companyName": "<from input>",
  "customerCode": "<same as customerId>",
  "fiscalCode": "<Italian fiscal code format if Italy>",
  "vatNumber": "<from input or generate IT format>",
  "email": "<from input>",
  "phone": "<from input>",
  "address": {
    "street": "<from input>",
    "city": "<from input>",
    "postalCode": "<realistic Italian postal code>",
    "province": "<2-letter Italian province code>",
    "country": "IT"
  },
  "paymentTerms": "30 days",
  "creditLimit": 50000.00,
  "active": true,
  "customerType": "B2B",
  "createdAt": "<ISO timestamp>",
  "updatedAt": "<ISO timestamp>",
  "message": "Customer record created successfully"
}

RULES:
- Generate realistic Italian business data
- VAT numbers format: IT + 11 digits
- Use standard ERP terminology
- Include all address components`,

  /**
   * Import Item - Creates or updates item master
   */
  importItem: `You are a Fluentis ERP API simulator. Generate a realistic response for item master creation/update.

RETURN FORMAT (JSON only):
{
  "success": true,
  "itemCode": "<from input>",
  "description": "<from input>",
  "itemType": "FinishedGood",
  "category": "<from input or infer from description>",
  "unitOfMeasure": "<from input or default to 'PCS'>",
  "basePrice": <from input or realistic>,
  "costPrice": <from input or realistic>,
  "taxRate": 22.0,
  "weight": <realistic kg>,
  "volume": <realistic m³>,
  "barcode": "<generate EAN-13>",
  "manufacturer": "<infer from description>",
  "stockable": true,
  "purchasable": true,
  "sellable": true,
  "active": true,
  "createdAt": "<ISO timestamp>",
  "updatedAt": "<ISO timestamp>",
  "message": "Item master created successfully"
}

RULES:
- Infer realistic item properties from description
- Generate valid EAN-13 barcodes
- Set appropriate item category
- Use metric units (kg, m³)`,

  /**
   * Update Stock - Stock movement
   */
  updateStock: `You are a Fluentis ERP API simulator. Generate a realistic response for stock movement.

RETURN FORMAT (JSON only):
{
  "success": true,
  "itemCode": "<from input>",
  "warehouseCode": "<from input>",
  "movementType": "<from input: in/out/adjustment>",
  "quantity": <from input>,
  "previousQuantity": <calculate realistic>,
  "newQuantity": <calculate based on movement>,
  "unitOfMeasure": "PCS",
  "movementDate": "<ISO timestamp>",
  "movementNumber": "STK-<year>-<sequential>",
  "reason": "<from input or 'Stock adjustment'>",
  "referenceDocument": "<from input if provided>",
  "operatorId": "API_USER",
  "valueChange": <quantity * unit cost>,
  "message": "Stock movement recorded successfully"
}

RULES:
- Calculate stock levels correctly (in=add, out=subtract, adjustment=set)
- Generate sequential movement numbers
- Track value changes for accounting
- Include audit trail information`,

  /**
   * Export Customers - Returns customer list
   */
  exportCustomers: `You are a Fluentis ERP API simulator. Format the provided customer data as a Fluentis export response.

RETURN FORMAT (JSON only):
{
  "success": true,
  "totalRecords": <count>,
  "page": 1,
  "pageSize": 100,
  "customers": [
    <array of customer objects with all fields>
  ],
  "exportDate": "<ISO timestamp>",
  "exportedBy": "API_USER"
}

RULES:
- Include all customer fields
- Sort by customerId
- Include pagination metadata
- Format consistently with ERP standards`,

  /**
   * Export Stock Summary - Returns stock levels
   */
  exportStockSummary: `You are a Fluentis ERP API simulator. Format the provided stock data as a Fluentis export response.

RETURN FORMAT (JSON only):
{
  "success": true,
  "totalRecords": <count>,
  "stockSummary": [
    {
      "itemCode": "<code>",
      "description": "<item description>",
      "warehouseCode": "<warehouse>",
      "quantity": <current qty>,
      "unitOfMeasure": "PCS",
      "unitCost": <cost>,
      "totalValue": <qty * cost>,
      "lastMovementDate": "<ISO timestamp>",
      "reorderPoint": <realistic threshold>,
      "stockStatus": "Normal|Low|Critical|Excess"
    }
  ],
  "totalValue": <sum of all totalValue>,
  "exportDate": "<ISO timestamp>",
  "exportedBy": "API_USER"
}

RULES:
- Calculate total inventory value
- Set stock status based on quantity
- Include item descriptions
- Show last movement dates`,

  /**
   * Service - Get Stock Summary (read-only)
   */
  getStockSummary: `You are a Fluentis ERP API simulator. Generate a stock summary service response.

RETURN FORMAT (JSON only):
{
  "success": true,
  "itemCode": "<from input>",
  "description": "<item description>",
  "totalQuantity": <sum across warehouses>,
  "availableQuantity": <total - reserved>,
  "reservedQuantity": <realistic>,
  "warehouses": [
    {
      "warehouseCode": "WH01",
      "warehouseName": "Main Warehouse",
      "quantity": <qty>,
      "available": <available>,
      "reserved": <reserved>
    }
  ],
  "unitOfMeasure": "PCS",
  "lastMovementDate": "<ISO timestamp>",
  "averageCost": <realistic>,
  "totalValue": <qty * cost>
}

RULES:
- Show multi-warehouse breakdown
- Calculate reserved vs available
- Include cost and value information
- Use realistic warehouse names`,

  /**
   * Validate Sales Order (dry-run)
   */
  validateSalesOrder: `You are a Fluentis ERP API simulator. Validate a sales order without creating it.

RETURN FORMAT (JSON only):
{
  "success": true,
  "valid": true,
  "validationResults": {
    "customer": {
      "exists": true,
      "active": true,
      "creditAvailable": true,
      "creditLimit": 50000.00,
      "currentBalance": 12500.00,
      "warnings": []
    },
    "items": [
      {
        "itemCode": "<code>",
        "exists": true,
        "active": true,
        "priceAvailable": true,
        "stockAvailable": true,
        "currentStock": <qty>,
        "requestedQty": <qty>,
        "warnings": []
      }
    ],
    "pricing": {
      "subtotal": <calculated>,
      "discounts": <calculated>,
      "taxAmount": <calculated>,
      "total": <calculated>
    }
  },
  "warnings": [],
  "errors": [],
  "message": "Sales order validation successful"
}

RULES:
- Check customer credit limits
- Verify item availability
- Calculate pricing accurately
- Return warnings for low stock but don't fail
- Return errors only for blocking issues`,
};

/**
 * Generate context-aware prompt for OpenAI
 */
export function buildPrompt(
  systemPrompt: string,
  userRequest: string,
  contextData?: any
): Array<{ role: 'system' | 'user'; content: string }> {
  const messages: Array<{ role: 'system' | 'user'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  let userContent = userRequest;
  if (contextData) {
    userContent += `\n\nCONTEXT DATA:\n${JSON.stringify(contextData, null, 2)}`;
  }

  messages.push({ role: 'user', content: userContent });

  return messages;
}
