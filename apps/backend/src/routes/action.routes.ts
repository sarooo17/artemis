import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { writeActionService } from '../services/write-action.service';
import { validateBody } from '../middleware/validation.middleware';
import { 
  ExecuteActionSchema, 
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
    // Execute action using WriteActionService
    const result = await writeActionService.execute(actionType, payload, {
      context,
      validateOnly: false,
      updateExisting: actionType.includes('update'),
      ignoreWarnings: false,
    });

    // Check if action succeeded
    if (!result.success) {
      // Handle validation errors differently from execution errors
      if (result.validationErrors) {
        throw new Error(`Validation failed: ${result.validationErrors.map(e => e.message).join(', ')}`);
      }
      throw new Error(result.error || 'Action execution failed');
    }

    // Extract entity ID from result
    const entityId = extractEntityId(result.data, actionType);

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

    // Generate LLM-friendly message for frontend
    const actionLabels: Record<string, string> = {
      'create_customer': 'Cliente creato',
      'update_customer': 'Cliente aggiornato',
      'create_sales_order': 'Ordine di vendita creato',
      'create_purchase_order': 'Ordine di acquisto creato',
      'create_item': 'Articolo creato',
      'update_stock': 'Stock aggiornato',
      'create_payment': 'Pagamento registrato',
    };
    
    const actionLabel = actionLabels[actionType] || 'Operazione completata';
    const llmMessage = entityId 
      ? `${actionLabel} con ID ${entityId}.`
      : `${actionLabel} con successo.`;

    // Return success response
    res.status(200).json({
      success: true,
      actionId: actionLog.id,
      entityId,
      llmMessage, // ✅ Add LLM-friendly message for confirmation UI
      result: {
        success: true,
        message: 'Operation completed successfully',
        data: result.data,
      },
      executionTimeMs,
    });

  } catch (error: any) {
    const executionTimeMs = Date.now() - startTime;
    
    // Check if this is a validation error (missing/invalid data)
    const isValidationError = 
      error.message?.includes('Validation failed') ||
      error.message?.includes('required') ||
      error.message?.includes('invalid') ||
      error.message?.includes('missing');
    
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
      // Flag to regenerate form with errors for validation issues
      editableForm: isValidationError,
      validationErrors: isValidationError ? error.message : undefined,
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
 * Extract entity ID from action result
 */
function extractEntityId(data: any, actionType: string): string | undefined {
  if (!data) return undefined;
  
  // Try standard Fluentis response structures
  if (data.ImportedObjects && data.ImportedObjects.length > 0) {
    const obj = data.ImportedObjects[0];
    // Try common ID fields
    return obj.OrderId || obj.CustomerId || obj.ItemCode || obj.Id;
  }
  
  // Try direct data fields
  if (data.Data) {
    return data.Data.OrderId || data.Data.CustomerId || data.Data.ItemCode || data.Data.Id;
  }
  
  // Try top-level fields
  return data.OrderId || data.CustomerId || data.ItemCode || data.Id;
}

export default router;
