import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { fluentisService } from '../services/fluentis.service';
import { validateBody } from '../middleware/validation.middleware';
import { 
  ExecuteActionSchema, 
  validateActionPayload,
  type ExecuteActionInput 
} from '../validators/action.validators';

const router = Router();

/**
 * POST /api/actions/execute
 * Execute a write operation on Fluentis ERP
 */
router.post('/execute', validateBody(ExecuteActionSchema), async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const { actionType, payload, sessionId } = req.body as ExecuteActionInput;
  const userId = req.user!.id;
  const context = req.context;

  // Extract IP and User Agent for audit log
  const ipAddress = req.ip || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];

  // Create action log entry (pending)
  let actionLog = await prisma.actionLog.create({
    data: {
      userId,
      sessionId,
      actionType,
      entityType: extractEntityType(actionType),
      requestPayload: payload,
      status: 'pending',
      ipAddress,
      userAgent,
    },
  });

  try {
    // Validate payload based on action type
    const validatedPayload = validateActionPayload(actionType, payload);

    // Inject context into payload
    const payloadWithContext = {
      ...validatedPayload,
      context,
    };

    // Execute action based on type
    let result: any;
    let entityId: string | undefined;

    switch (actionType) {
      case 'create_sales_order':
        result = await fluentisService.createSalesOrder(payloadWithContext);
        entityId = extractEntityId(result, 'OrderId');
        break;

      case 'validate_sales_order':
        result = await fluentisService.validateSalesOrder(payloadWithContext);
        break;

      case 'create_customer':
        result = await fluentisService.createCustomer(payloadWithContext);
        entityId = payloadWithContext.customerId;
        break;

      case 'update_customer':
        result = await fluentisService.updateCustomer(payloadWithContext);
        entityId = payloadWithContext.customerId;
        break;

      case 'create_item':
        result = await fluentisService.createItem(payloadWithContext);
        entityId = payloadWithContext.itemCode;
        break;

      case 'update_stock':
        result = await fluentisService.updateStock(payloadWithContext);
        entityId = payloadWithContext.itemCode;
        break;

      default:
        throw new Error(`Unsupported action type: ${actionType}`);
    }

    // Check if Fluentis operation succeeded
    if (!result.Success) {
      throw new Error(result.ErrorMessage || 'Fluentis operation failed');
    }

    // Update action log with success
    const executionTimeMs = Date.now() - startTime;
    actionLog = await prisma.actionLog.update({
      where: { id: actionLog.id },
      data: {
        status: 'success',
        entityId,
        responsePayload: result,
        executionTimeMs,
        completedAt: new Date(),
      },
    });

    console.log(`✅ Action ${actionType} executed successfully in ${executionTimeMs}ms`);

    // Return success response
    res.status(200).json({
      success: true,
      actionId: actionLog.id,
      entityId,
      result: {
        success: result.Success,
        message: result.Message || 'Operation completed successfully',
        warnings: result.Warnings,
        validationErrors: result.ValidationErrors,
      },
      executionTimeMs,
    });

  } catch (error: any) {
    const executionTimeMs = Date.now() - startTime;
    
    // Update action log with failure
    await prisma.actionLog.update({
      where: { id: actionLog.id },
      data: {
        status: 'failed',
        errorMessage: error.message,
        executionTimeMs,
        completedAt: new Date(),
      },
    });

    console.error(`❌ Action ${actionType} failed:`, error.message);

    // Return error response
    res.status(400).json({
      success: false,
      actionId: actionLog.id,
      error: error.message,
      executionTimeMs,
    });
  }
});

/**
 * GET /api/actions/history
 * Get action history for current user
 */
router.get('/history', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { sessionId, actionType, status, limit = '50', offset = '0' } = req.query;

    const where: any = { userId };
    if (sessionId) where.sessionId = sessionId as string;
    if (actionType) where.actionType = actionType as string;
    if (status) where.status = status as string;

    const actions = await prisma.actionLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      select: {
        id: true,
        actionType: true,
        entityType: true,
        entityId: true,
        status: true,
        errorMessage: true,
        executionTimeMs: true,
        createdAt: true,
        completedAt: true,
      },
    });

    const total = await prisma.actionLog.count({ where });

    res.json({
      actions,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error: any) {
    console.error('Failed to fetch action history:', error);
    res.status(500).json({ error: 'Failed to fetch action history' });
  }
});

/**
 * GET /api/actions/:id
 * Get detailed information about a specific action
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const action = await prisma.actionLog.findFirst({
      where: {
        id,
        userId, // Ensure user can only see their own actions
      },
    });

    if (!action) {
      res.status(404).json({ error: 'Action not found' });
      return;
    }

    res.json(action);
  } catch (error: any) {
    console.error('Failed to fetch action:', error);
    res.status(500).json({ error: 'Failed to fetch action' });
  }
});

// ====== HELPER FUNCTIONS ======

/**
 * Extract entity type from action type
 */
function extractEntityType(actionType: string): string {
  if (actionType.includes('sales_order')) return 'sales_order';
  if (actionType.includes('customer')) return 'customer';
  if (actionType.includes('item')) return 'item';
  if (actionType.includes('stock')) return 'stock';
  return 'unknown';
}

/**
 * Extract entity ID from Fluentis response
 */
function extractEntityId(result: any, idField: string): string | undefined {
  if (result.ImportedObjects && result.ImportedObjects.length > 0) {
    return result.ImportedObjects[0][idField];
  }
  if (result.Data && result.Data[idField]) {
    return result.Data[idField];
  }
  return undefined;
}

export default router;
