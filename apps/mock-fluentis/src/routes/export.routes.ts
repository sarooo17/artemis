/**
 * Export & Service Routes - Read Operations
 * Handles data retrieval from Fluentis
 */
import { Router, Request, Response } from 'express';
import { mockDb } from '../state';
import { SYSTEM_PROMPTS, buildPrompt } from '../prompts';
import { getOpenAI } from '../openai-client';

const router = Router();

/**
 * POST /api/export/ExportCustomers
 * Exports customer list
 */
router.post('/ExportCustomers', async (req: Request, res: Response) => {
  try {
    const customers = mockDb.getAllCustomers();

    const userRequest = `Export ${customers.length} customers from database`;

    const openai = getOpenAI(); const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: buildPrompt(SYSTEM_PROMPTS.exportCustomers, userRequest, { customers }),
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content || '{}');

    const response = {
      ...aiResponse,
      TotalRecords: customers.length,
      customers: customers.map((c) => ({
        customerId: c.customerId,
        companyName: c.companyName,
        email: c.email,
        phone: c.phone,
        address: c.address,
        city: c.city,
        country: c.country,
        vatNumber: c.vatNumber,
        active: c.active,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
      ExportDate: new Date().toISOString(),
    };

    res.json(response);
  } catch (error: any) {
    console.error('ExportCustomers error:', error);
    res.status(500).json({
      Success: false,
      error: 'EXPORT_FAILED',
      message: error.message || 'Failed to export customers',
    });
  }
});

/**
 * POST /api/export/ExportItems
 * Exports item master list
 */
router.post('/ExportItems', async (req: Request, res: Response) => {
  try {
    const items = mockDb.getAllItems();

    const response = {
      Success: true,
      TotalRecords: items.length,
      items: items.map((item) => ({
        itemCode: item.itemCode,
        description: item.description,
        category: item.category,
        unitPrice: item.unitPrice,
        cost: item.cost,
        unitOfMeasure: item.unitOfMeasure,
        active: item.active,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
      ExportDate: new Date().toISOString(),
      ExportedBy: 'API_USER',
    };

    res.json(response);
  } catch (error: any) {
    console.error('ExportItems error:', error);
    res.status(500).json({
      Success: false,
      error: 'EXPORT_FAILED',
      message: error.message || 'Failed to export items',
    });
  }
});

/**
 * POST /api/export/ExportSalesOrders
 * Exports sales order list
 */
router.post('/ExportSalesOrders', async (req: Request, res: Response) => {
  try {
    const { customerId, fromDate, toDate } = req.body;

    let orders = mockDb.getAllSalesOrders();

    // Filter by customer if specified
    if (customerId) {
      orders = orders.filter((o) => o.customerId === customerId);
    }

    // Filter by date range if specified
    if (fromDate) {
      orders = orders.filter((o) => o.orderDate >= fromDate);
    }
    if (toDate) {
      orders = orders.filter((o) => o.orderDate <= toDate);
    }

    const response = {
      Success: true,
      TotalRecords: orders.length,
      Data: orders.map((order) => ({
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customerName: order.customerName,
        orderDate: order.orderDate,
        deliveryDate: order.deliveryDate,
        totalAmount: order.totalAmount,
        status: order.status,
        itemCount: order.items.length,
        createdAt: order.createdAt.toISOString(),
      })),
      ExportDate: new Date().toISOString(),
      ExportedBy: 'API_USER',
    };

    res.json(response);
  } catch (error: any) {
    console.error('ExportSalesOrders error:', error);
    res.status(500).json({
      Success: false,
      error: 'EXPORT_FAILED',
      message: error.message || 'Failed to export sales orders',
    });
  }
});

/**
 * POST /api/export/ExportStockSummary
 * Exports stock levels summary
 */
router.post('/ExportStockSummary', async (req: Request, res: Response) => {
  try {
    const { itemCode, warehouseCode } = req.body;

    let stockRecords = mockDb.getAllStock();

    // Filter by item if specified
    if (itemCode) {
      stockRecords = stockRecords.filter((s) => s.itemCode === itemCode);
    }

    // Filter by warehouse if specified
    if (warehouseCode) {
      stockRecords = stockRecords.filter((s) => s.warehouseCode === warehouseCode);
    }

    const userRequest = `Export stock summary for ${stockRecords.length} records`;

    const openai = getOpenAI(); const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: buildPrompt(SYSTEM_PROMPTS.exportStockSummary, userRequest, { stockRecords }),
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content || '{}');

    const stockSummary = stockRecords.map((record) => {
      const item = mockDb.getItem(record.itemCode);
      const totalValue = record.quantity * (item?.cost || 0);

      return {
        itemCode: record.itemCode,
        description: item?.description || 'Unknown item',
        warehouseCode: record.warehouseCode,
        quantity: record.quantity,
        unitOfMeasure: item?.unitOfMeasure || 'PCS',
        unitCost: item?.cost || 0,
        totalValue,
        lastMovementDate: record.lastMovementDate.toISOString(),
        stockStatus:
          record.quantity === 0
            ? 'Empty'
            : record.quantity < 10
              ? 'Low'
              : record.quantity > 200
                ? 'Excess'
                : 'Normal',
      };
    });

    const totalValue = stockSummary.reduce((sum, s) => sum + s.totalValue, 0);

    const response = {
      ...aiResponse,
      TotalRecords: stockSummary.length,
      stockSummary,
      totalValue,
      ExportDate: new Date().toISOString(),
    };

    res.json(response);
  } catch (error: any) {
    console.error('ExportStockSummary error:', error);
    res.status(500).json({
      Success: false,
      error: 'EXPORT_FAILED',
      message: error.message || 'Failed to export stock summary',
    });
  }
});

/**
 * POST /api/service/GetStockSummary
 * Gets stock summary for a specific item (read-only service)
 */
router.post('/GetStockSummary', async (req: Request, res: Response) => {
  try {
    const { itemCode } = req.body;

    if (!itemCode) {
      return res.status(400).json({
        Success: false,
        error: 'MISSING_REQUIRED_FIELDS',
        message: 'itemCode is required',
      });
    }

    const item = mockDb.getItem(itemCode);
    if (!item) {
      return res.status(404).json({
        Success: false,
        error: 'ITEM_NOT_FOUND',
        message: `Item ${itemCode} not found`,
      });
    }

    const stockRecords = mockDb.getItemStock(itemCode);

    const totalQuantity = stockRecords.reduce((sum, r) => sum + r.quantity, 0);
    const reservedQuantity = Math.floor(totalQuantity * 0.1); // Mock 10% reserved
    const availableQuantity = totalQuantity - reservedQuantity;

    const userRequest = `Get stock summary for item ${itemCode}`;

    const openai = getOpenAI(); const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: buildPrompt(SYSTEM_PROMPTS.getStockSummary, userRequest, {
        item,
        stockRecords,
        totalQuantity,
        availableQuantity,
        reservedQuantity,
      }),
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content || '{}');

    const warehouses = stockRecords.map((record) => ({
      warehouseCode: record.warehouseCode,
      warehouseName: `Warehouse ${record.warehouseCode}`,
      quantity: record.quantity,
      available: Math.floor(record.quantity * 0.9),
      reserved: Math.floor(record.quantity * 0.1),
      lastMovementDate: record.lastMovementDate.toISOString(),
    }));

    const response = {
      ...aiResponse,
      itemCode,
      description: item.description,
      totalQuantity,
      availableQuantity,
      reservedQuantity,
      warehouses,
      unitOfMeasure: item.unitOfMeasure,
      averageCost: item.cost,
      totalValue: totalQuantity * (item.cost || 0),
    };

    res.json(response);
  } catch (error: any) {
    console.error('GetStockSummary error:', error);
    res.status(500).json({
      Success: false,
      error: 'SERVICE_FAILED',
      message: error.message || 'Failed to get stock summary',
    });
  }
});

/**
 * POST /api/service/ValidateSalesOrder
 * Validates a sales order without creating it (dry-run)
 */
router.post('/ValidateSalesOrder', async (req: Request, res: Response) => {
  try {
    const { customerId, items } = req.body;

    if (!customerId || !items || items.length === 0) {
      return res.status(400).json({
        Success: false,
        error: 'MISSING_REQUIRED_FIELDS',
        message: 'customerId and items are required',
      });
    }

    // Validate customer
    const customer = mockDb.getCustomer(customerId);
    if (!customer) {
      return res.status(404).json({
        Success: false,
        valid: false,
        error: 'CUSTOMER_NOT_FOUND',
        message: `Customer ${customerId} not found`,
      });
    }

    // Validate items
    const itemValidations = items.map((orderItem: any) => {
      const item = mockDb.getItem(orderItem.itemCode);
      const stockRecords = mockDb.getItemStock(orderItem.itemCode);
      const totalStock = stockRecords.reduce((sum, r) => sum + r.quantity, 0);

      return {
        itemCode: orderItem.itemCode,
        exists: !!item,
        active: item?.active || false,
        priceAvailable: !!item?.unitPrice,
        stockAvailable: totalStock >= orderItem.quantity,
        currentStock: totalStock,
        requestedQty: orderItem.quantity,
        warnings:
          totalStock < orderItem.quantity ? [`Insufficient stock: ${totalStock} available`] : [],
      };
    });

    const hasErrors = itemValidations.some((v: any) => !v.exists || !v.active);
    const hasWarnings = itemValidations.some((v: any) => v.warnings.length > 0);

    // Calculate pricing
    const subtotal = items.reduce((sum: number, item: any) => {
      const dbItem = mockDb.getItem(item.itemCode);
      return sum + (item.quantity * (dbItem?.unitPrice || 0));
    }, 0);

    const taxAmount = subtotal * 0.22; // 22% VAT
    const total = subtotal + taxAmount;

    const userRequest = `Validate sales order for customer ${customerId} with ${items.length} items`;

    const openai = getOpenAI(); const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: buildPrompt(SYSTEM_PROMPTS.validateSalesOrder, userRequest, {
        customer,
        itemValidations,
        subtotal,
        taxAmount,
        total,
      }),
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content || '{}');

    const response = {
      ...aiResponse,
      valid: !hasErrors,
      validationResults: {
        customer: {
          exists: true,
          active: customer.active,
          creditAvailable: true,
          warnings: [],
        },
        items: itemValidations,
        pricing: {
          subtotal,
          taxAmount,
          total,
        },
      },
      warnings: hasWarnings ? ['Some items have low stock'] : [],
      errors: hasErrors ? ['Some items are not available'] : [],
    };

    res.json(response);
  } catch (error: any) {
    console.error('ValidateSalesOrder error:', error);
    res.status(500).json({
      Success: false,
      error: 'VALIDATION_FAILED',
      message: error.message || 'Failed to validate sales order',
    });
  }
});

/**
 * POST /WM/Common/GetItemsStock
 * Get stock information for multiple items
 */
router.post('/GetItemsStock', async (req: Request, res: Response) => {
  try {
    // Handle both ItemCodes (array) and ItemCode (single string)
    let itemCodes = req.body.ItemCodes || req.body.itemCodes;
    
    // If single ItemCode provided, convert to array
    if (!itemCodes && (req.body.ItemCode || req.body.itemCode)) {
      itemCodes = [req.body.ItemCode || req.body.itemCode];
    }
    
    // If still empty, get all items
    if (!itemCodes || !Array.isArray(itemCodes)) {
      itemCodes = mockDb.getAllItems().map(item => item.itemCode);
    }

    const stockData = itemCodes.map((itemCode: string) => {
      const item = mockDb.getItem(itemCode);
      const stockRecords = mockDb.getItemStock(itemCode);
      
      const totalQuantity = stockRecords.reduce((sum, r) => sum + r.quantity, 0);
      const reservedQuantity = Math.floor(totalQuantity * 0.1);
      const availableQuantity = totalQuantity - reservedQuantity;

      return {
        ItemCode: itemCode,
        Description: item?.description || 'Unknown Item',
        TotalQuantity: totalQuantity,
        AvailableQuantity: availableQuantity,
        ReservedQuantity: reservedQuantity,
        UnitOfMeasure: item?.unitOfMeasure || 'PCS',
        Warehouses: stockRecords.map((record) => ({
          WarehouseCode: record.warehouseCode,
          WarehouseName: `Warehouse ${record.warehouseCode}`,
          Quantity: record.quantity,
          Available: Math.floor(record.quantity * 0.9),
          Reserved: Math.floor(record.quantity * 0.1),
        })),
      };
    });

    res.json({
      Success: true,
      Data: stockData,
      TotalItems: stockData.length,
    });
  } catch (error: any) {
    console.error('GetItemsStock error:', error);
    res.status(500).json({
      Success: false,
      ErrorMessage: error.message || 'Failed to get items stock',
    });
  }
});

export default router;

