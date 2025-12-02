/**
 * Import Routes - Write Operations
 * Handles data creation/updates in Fluentis
 */
import { Router, Request, Response } from 'express';
import { mockDb } from '../state';
import { SYSTEM_PROMPTS, buildPrompt } from '../prompts';
import { getOpenAI } from '../openai-client';

const router = Router();

/**
 * POST /api/import/ImportSalesOrder
 * Creates a new sales order
 */
router.post('/ImportSalesOrder', async (req: Request, res: Response) => {
  try {
    const { customerId, customerName, orderDate, deliveryDate, notes, items } = req.body;

    // Validate customer exists
    const customer = mockDb.getCustomer(customerId);
    if (!customer) {
      return res.status(404).json({
        Success: false,
        error: 'CUSTOMER_NOT_FOUND',
        message: `Customer ${customerId} not found`,
      });
    }

    // Generate realistic response with OpenAI
    const userRequest = `Create a sales order:
- Customer ID: ${customerId}
- Customer Name: ${customerName || customer.companyName}
- Order Date: ${orderDate}
- Delivery Date: ${deliveryDate || 'Not specified'}
- Notes: ${notes || 'None'}
- Items: ${JSON.stringify(items)}`;

    const openai = getOpenAI(); const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: buildPrompt(SYSTEM_PROMPTS.importSalesOrder, userRequest),
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content || '{}');

    // Calculate total
    const totalAmount = items.reduce((sum: number, item: any) => {
      const lineTotal = item.quantity * (item.unitPrice || 0) * (1 - (item.discount || 0) / 100);
      return sum + lineTotal;
    }, 0);

    // Save to mock database
    const salesOrder = mockDb.createSalesOrder({
      customerId,
      customerName: customerName || customer.companyName,
      orderDate,
      deliveryDate,
      notes,
      items: items.map((item: any, index: number) => ({
        itemCode: item.itemCode,
        description: item.description || mockDb.getItem(item.itemCode)?.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        total: item.quantity * (item.unitPrice || 0) * (1 - (item.discount || 0) / 100),
      })),
      totalAmount,
    });

    // Merge AI response with actual data
    const response = {
      ...aiResponse,
      orderId: salesOrder.orderId,
      orderNumber: salesOrder.orderNumber,
      customerId: salesOrder.customerId,
      customerName: salesOrder.customerName,
      totalAmount: salesOrder.totalAmount,
      createdAt: salesOrder.createdAt.toISOString(),
    };

    res.json(response);
  } catch (error: any) {
    console.error('ImportSalesOrder error:', error);
    res.status(500).json({
      Success: false,
      error: 'IMPORT_FAILED',
      message: error.message || 'Failed to create sales order',
    });
  }
});

/**
 * POST /api/import/ImportCustomer
 * Creates or updates a customer
 */
router.post('/ImportCustomer', async (req: Request, res: Response) => {
  try {
    const { customerId, companyName, email, phone, address, city, country, vatNumber } = req.body;

    if (!customerId || !companyName) {
      return res.status(400).json({
        Success: false,
        error: 'MISSING_REQUIRED_FIELDS',
        message: 'customerId and companyName are required',
      });
    }

    // Check if customer exists
    const existing = mockDb.getCustomer(customerId);

    const userRequest = `${existing ? 'Update' : 'Create'} customer:
- Customer ID: ${customerId}
- Company Name: ${companyName}
- Email: ${email || 'Not provided'}
- Phone: ${phone || 'Not provided'}
- Address: ${address || 'Not provided'}
- City: ${city || 'Not provided'}
- Country: ${country || 'Italy'}
- VAT Number: ${vatNumber || 'Not provided'}`;

    const openai = getOpenAI(); const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: buildPrompt(SYSTEM_PROMPTS.importCustomer, userRequest),
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content || '{}');

    // Save to database
    let customer;
    if (existing) {
      customer = mockDb.updateCustomer(customerId, {
        companyName,
        email,
        phone,
        address,
        city,
        country: country || 'Italy',
        vatNumber,
        active: true,
      });
    } else {
      customer = mockDb.createCustomer({
        customerId,
        companyName,
        email,
        phone,
        address,
        city,
        country: country || 'Italy',
        vatNumber,
        active: true,
      });
    }

    const response = {
      ...aiResponse,
      customerId: customer!.customerId,
      companyName: customer!.companyName,
      createdAt: customer!.createdAt.toISOString(),
      updatedAt: customer!.updatedAt.toISOString(),
    };

    res.json(response);
  } catch (error: any) {
    console.error('ImportCustomer error:', error);
    res.status(500).json({
      Success: false,
      error: 'IMPORT_FAILED',
      message: error.message || 'Failed to import customer',
    });
  }
});

/**
 * POST /api/import/ImportItem
 * Creates or updates an item
 */
router.post('/ImportItem', async (req: Request, res: Response) => {
  try {
    const { itemCode, description, category, unitPrice, cost, unitOfMeasure } = req.body;

    if (!itemCode || !description) {
      return res.status(400).json({
        Success: false,
        error: 'MISSING_REQUIRED_FIELDS',
        message: 'itemCode and description are required',
      });
    }

    const existing = mockDb.getItem(itemCode);

    const userRequest = `${existing ? 'Update' : 'Create'} item:
- Item Code: ${itemCode}
- Description: ${description}
- Category: ${category || 'General'}
- Unit Price: ${unitPrice || 'Not specified'}
- Cost: ${cost || 'Not specified'}
- Unit of Measure: ${unitOfMeasure || 'PCS'}`;

    const openai = getOpenAI(); const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: buildPrompt(SYSTEM_PROMPTS.importItem, userRequest),
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content || '{}');

    let item;
    if (existing) {
      item = mockDb.updateItem(itemCode, {
        description,
        category,
        unitPrice,
        cost,
        unitOfMeasure: unitOfMeasure || 'PCS',
        active: true,
      });
    } else {
      item = mockDb.createItem({
        itemCode,
        description,
        category,
        unitPrice,
        cost,
        unitOfMeasure: unitOfMeasure || 'PCS',
        active: true,
      });
    }

    const response = {
      ...aiResponse,
      itemCode: item!.itemCode,
      description: item!.description,
      createdAt: item!.createdAt.toISOString(),
      updatedAt: item!.updatedAt.toISOString(),
    };

    res.json(response);
  } catch (error: any) {
    console.error('ImportItem error:', error);
    res.status(500).json({
      Success: false,
      error: 'IMPORT_FAILED',
      message: error.message || 'Failed to import item',
    });
  }
});

/**
 * POST /api/operation/UpdateStock
 * Updates stock levels
 */
router.post('/UpdateStock', async (req: Request, res: Response) => {
  try {
    const { itemCode, warehouseCode, quantity, movementType, reason, referenceDocument } =
      req.body;

    if (!itemCode || !warehouseCode || quantity === undefined || !movementType) {
      return res.status(400).json({
        Success: false,
        error: 'MISSING_REQUIRED_FIELDS',
        message: 'itemCode, warehouseCode, quantity, and movementType are required',
      });
    }

    // Validate item exists
    const item = mockDb.getItem(itemCode);
    if (!item) {
      return res.status(404).json({
        Success: false,
        error: 'ITEM_NOT_FOUND',
        message: `Item ${itemCode} not found`,
      });
    }

    // Get previous stock
    const previousStock = mockDb.getStock(itemCode, warehouseCode);
    const previousQuantity = previousStock?.quantity || 0;

    const userRequest = `Update stock:
- Item Code: ${itemCode}
- Warehouse: ${warehouseCode}
- Movement Type: ${movementType}
- Quantity: ${quantity}
- Previous Quantity: ${previousQuantity}
- Reason: ${reason || 'Stock movement'}
- Reference: ${referenceDocument || 'None'}`;

    const openai = getOpenAI(); const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: buildPrompt(SYSTEM_PROMPTS.updateStock, userRequest),
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content || '{}');

    // Update stock in database
    const stockRecord = mockDb.updateStock(
      itemCode,
      warehouseCode,
      quantity,
      movementType,
      reason,
      referenceDocument
    );

    const response = {
      ...aiResponse,
      itemCode: stockRecord.itemCode,
      warehouseCode: stockRecord.warehouseCode,
      previousQuantity,
      newQuantity: stockRecord.quantity,
      movementDate: stockRecord.lastMovementDate.toISOString(),
    };

    res.json(response);
  } catch (error: any) {
    console.error('UpdateStock error:', error);
    res.status(500).json({
      Success: false,
      error: 'UPDATE_FAILED',
      message: error.message || 'Failed to update stock',
    });
  }
});

export default router;

