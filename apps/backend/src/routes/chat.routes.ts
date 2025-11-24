import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { requireAuth, AuthRequest, optionalAuth } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';

const router = Router();

// Validation schemas
const createSessionSchema = z.object({
  title: z.string().optional(),
  tempSessionId: z.string().optional(),
});

const createMessageSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  role: z.enum(['user', 'assistant']),
});

/**
 * GET /api/chat/sessions
 * Get all chat sessions for authenticated user
 */
router.get('/sessions', requireAuth as any, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sessions = await prisma.chatSession.findMany({
      where: { userId: req.user!.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 1, // Only get first message for preview
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    console.log(`📋 Found ${sessions.length} sessions for user ${req.user!.id}`);
    res.json({ sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/chat/sessions/:id
 * Get single chat session with all messages
 */
router.get('/sessions/:id', requireAuth as any, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const session = await prisma.chatSession.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json({ session });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/chat/sessions
 * Create new chat session
 */
router.post('/sessions', requireAuth as any, validateBody(createSessionSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, tempSessionId } = req.body;

    const session = await prisma.chatSession.create({
      data: {
        userId: req.user!.id,
        title: title || 'New Chat',
        tempSessionId,
      },
    });

    res.status(201).json({ session });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/chat/sessions/:id/messages
 * Add message to chat session
 */
router.post('/sessions/:id/messages', requireAuth as any, validateBody(createMessageSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { content, role } = req.body;

    // Verify session belongs to user
    const session = await prisma.chatSession.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const message = await prisma.chatMessage.create({
      data: {
        sessionId: req.params.id,
        content,
        role,
      },
    });

    // Update session timestamp
    await prisma.chatSession.update({
      where: { id: req.params.id },
      data: { updatedAt: new Date() },
    });

    res.status(201).json({ message });
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/chat/sessions/:id
 * Delete chat session
 */
router.delete('/sessions/:id', requireAuth as any, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Verify session belongs to user
    const session = await prisma.chatSession.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    await prisma.chatSession.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/chat/claim-sessions
 * Claim anonymous sessions after login
 */
router.post('/claim-sessions', requireAuth as any, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tempSessionId } = req.body;

    if (!tempSessionId) {
      res.status(400).json({ error: 'tempSessionId is required' });
      return;
    }

    // Update all sessions with this tempSessionId to belong to the user
    const result = await prisma.chatSession.updateMany({
      where: {
        tempSessionId,
        userId: null,
      },
      data: {
        userId: req.user!.id,
      },
    });

    res.json({ 
      message: 'Sessions claimed successfully',
      count: result.count,
    });
  } catch (error) {
    console.error('Claim sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/chat/search
 * Search chat sessions by title
 */
router.get('/search', requireAuth as any, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const query = req.query.q as string;
    
    if (!query || typeof query !== 'string') {
      res.json({ results: [] });
      return;
    }

    const sessions = await prisma.chatSession.findMany({
      where: {
        userId: req.user!.id,
        title: {
          contains: query,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        title: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 10, // Limit to 10 results
    });

    res.json({ results: sessions });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
