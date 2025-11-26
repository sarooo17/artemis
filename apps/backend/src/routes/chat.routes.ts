import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { OpenAIService } from '../services/openai.service';
import { orchestrationService } from '../services/orchestration.service';
import { sendMessageSchema, forkChatSchema, updateSessionSchema } from '../validators/common.validators';

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
 * Get all chat sessions for authenticated user (excluding archived)
 */
router.get('/sessions', requireAuth as any, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const includeArchived = req.query.includeArchived === 'true';

    const sessions = await prisma.chatSession.findMany({
      where: {
        userId,
        ...(includeArchived ? {} : { isArchived: false }),
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 1, // Only get first message for preview
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

/**
 * GET /api/chat/sessions/:id
 * Get single chat session with all messages
 */
router.get('/sessions/:id', requireAuth as any, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    const session = await prisma.chatSession.findFirst({
      where: {
        id: req.params.id,
        userId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ session });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

/**
 * POST /api/chat/sessions
 * Create new chat session
 */
router.post('/sessions', requireAuth as any, validateBody(createSessionSchema), async (req: Request, res: Response): Promise<void> => {
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
 * POST /api/chat/send/stream
 * Send message and get AI response with streaming (creates session if needed)
 */
router.post('/send/stream', requireAuth as any, validateBody(sendMessageSchema), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { message, sessionId } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    let session;
    let isNewSession = false;

    // If no sessionId, create new session
    if (!sessionId) {
      session = await prisma.chatSession.create({
        data: {
          userId,
          title: 'New Chat',
        },
      });
      isNewSession = true;
    } else {
      // Verify session belongs to user
      session = await prisma.chatSession.findFirst({
        where: {
          id: sessionId,
          userId,
          isArchived: false,
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
    }

    // Save user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'user',
        content: message,
      },
    });

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send session info first
    res.write(`data: ${JSON.stringify({ type: 'session', sessionId: session.id, userMessageId: userMessage.id })}\n\n`);

    // Prepare conversation history
    const conversationHistory = session.messages
      ? session.messages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))
      : [];

    conversationHistory.push({ role: 'user', content: message });

    let fullResponse = '';

    try {
      // Stream AI response
      await OpenAIService.chatStream(conversationHistory, (chunk, isThinking) => {
        if (isThinking) {
          res.write(`data: ${JSON.stringify({ type: 'thinking', content: chunk })}\n\n`);
        } else {
          fullResponse += chunk;
          res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
        }
      });

      // Save AI message
      const aiMessage = await prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          role: 'assistant',
          content: fullResponse,
        },
      });

      // Generate title if it's a new session
      if (isNewSession) {
        try {
          const title = await OpenAIService.generateTitle(message);
          await prisma.chatSession.update({
            where: { id: session.id },
            data: { title },
          });
        } catch (error) {
          console.error('Failed to generate title:', error);
        }
      }

      // Update session timestamp
      await prisma.chatSession.update({
        where: { id: session.id },
        data: { updatedAt: new Date() },
      });

      // Send done message
      res.write(`data: ${JSON.stringify({ type: 'done', messageId: aiMessage.id })}\n\n`);
      res.end();
    } catch (error: any) {
      console.error('OpenAI error:', error);
      
      if (error.message === 'RATE_LIMIT') {
        res.write(`data: ${JSON.stringify({ type: 'error', code: 'RATE_LIMIT', message: 'Rate limit exceeded. Please wait a moment and try again.' })}\n\n`);
      } else if (error.message === 'INVALID_API_KEY') {
        res.write(`data: ${JSON.stringify({ type: 'error', code: 'INVALID_API_KEY', message: 'OpenAI API key is invalid. Please contact support.' })}\n\n`);
      } else if (error.message === 'OPENAI_SERVER_ERROR') {
        res.write(`data: ${JSON.stringify({ type: 'error', code: 'OPENAI_SERVER_ERROR', message: 'OpenAI service is temporarily unavailable. Please try again later.' })}\n\n`);
      } else {
        res.write(`data: ${JSON.stringify({ type: 'error', code: 'UNKNOWN_ERROR', message: 'Failed to get AI response. Please try again.' })}\n\n`);
      }
      res.end();
    }
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/chat/send
 * Send message and get AI response (creates session if needed)
 */
router.post('/send', requireAuth as any, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { message, sessionId } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    let session;
    let isNewSession = false;

    // If no sessionId, create new session
    if (!sessionId) {
      session = await prisma.chatSession.create({
        data: {
          userId,
          title: 'New Chat', // Temporary title
        },
      });
      isNewSession = true;
    } else {
      // Verify session belongs to user
      session = await prisma.chatSession.findFirst({
        where: {
          id: sessionId,
          userId,
          isArchived: false,
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
    }

    // Save user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'user',
        content: message,
      },
    });

    // Prepare conversation history for OpenAI
    const conversationHistory = session.messages
      ? session.messages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))
      : [];

    conversationHistory.push({ role: 'user', content: message });

    // Get AI response
    let aiResponse: string;
    try {
      aiResponse = await OpenAIService.chat(conversationHistory);
    } catch (error: any) {
      console.error('OpenAI error:', error);
      
      // Return specific error messages
      if (error.message === 'RATE_LIMIT') {
        return res.status(429).json({ 
          error: 'Rate limit exceeded. Please wait a moment and try again.',
          code: 'RATE_LIMIT'
        });
      } else if (error.message === 'INVALID_API_KEY') {
        return res.status(500).json({ 
          error: 'OpenAI API key is invalid. Please contact support.',
          code: 'INVALID_API_KEY'
        });
      } else if (error.message === 'OPENAI_SERVER_ERROR') {
        return res.status(503).json({ 
          error: 'OpenAI service is temporarily unavailable. Please try again later.',
          code: 'OPENAI_SERVER_ERROR'
        });
      }
      
      return res.status(500).json({ 
        error: 'Failed to get AI response. Please try again.',
        code: 'UNKNOWN_ERROR'
      });
    }

    // Save AI message
    const aiMessage = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'assistant',
        content: aiResponse,
      },
    });

    // Generate title if it's a new session
    if (isNewSession) {
      try {
        const title = await OpenAIService.generateTitle(message);
        session = await prisma.chatSession.update({
          where: { id: session.id },
          data: { title },
        });
      } catch (error) {
        // If title generation fails, keep default title
        console.error('Title generation error:', error);
      }
    } else {
      // Update session timestamp
      await prisma.chatSession.update({
        where: { id: session.id },
        data: { updatedAt: new Date() },
      });
    }

    res.json({
      session: {
        id: session.id,
        title: session.title,
      },
      userMessage,
      assistantMessage: aiMessage,
      isNewSession,
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * POST /api/chat/sessions/:id/fork
 * Fork a chat session from a specific message (replaces messages from that point)
 */
router.post('/sessions/:id/fork', requireAuth as any, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { messageId, newMessage } = req.body;

    if (!messageId || !newMessage || typeof newMessage !== 'string') {
      return res.status(400).json({ error: 'messageId and newMessage are required' });
    }

    // Get session with messages
    const session = await prisma.chatSession.findFirst({
      where: { id, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Find the index of the message to fork from
    const messageIndex = session.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Get messages up to (but not including) the edited message
    const messagesToKeep = session.messages.slice(0, messageIndex);
    const messagesToDelete = session.messages.slice(messageIndex);

    // Delete all messages from the fork point onwards
    if (messagesToDelete.length > 0) {
      await prisma.chatMessage.deleteMany({
        where: {
          id: {
            in: messagesToDelete.map(m => m.id),
          },
        },
      });
    }

    // Add the new edited user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'user',
        content: newMessage,
      },
    });

    // Prepare conversation history for OpenAI
    const conversationHistory = messagesToKeep.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
    conversationHistory.push({ role: 'user', content: newMessage });

    // Get AI response
    let aiResponse: string;
    try {
      aiResponse = await OpenAIService.chat(conversationHistory);
    } catch (error: any) {
      console.error('OpenAI error:', error);
      
      if (error.message === 'RATE_LIMIT') {
        return res.status(429).json({ 
          error: 'Rate limit exceeded. Please wait a moment and try again.',
          code: 'RATE_LIMIT'
        });
      } else if (error.message === 'INVALID_API_KEY') {
        return res.status(500).json({ 
          error: 'OpenAI API key is invalid. Please contact support.',
          code: 'INVALID_API_KEY'
        });
      } else if (error.message === 'OPENAI_SERVER_ERROR') {
        return res.status(503).json({ 
          error: 'OpenAI service is temporarily unavailable. Please try again later.',
          code: 'OPENAI_SERVER_ERROR'
        });
      }
      
      return res.status(500).json({ 
        error: 'Failed to get AI response. Please try again.',
        code: 'UNKNOWN_ERROR'
      });
    }

    // Save AI message
    const aiMessage = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'assistant',
        content: aiResponse,
      },
    });

    // If we're editing the first message, auto-rename the chat
    let updatedTitle = session.title;
    if (messageIndex === 0) {
      try {
        const generatedTitle = await OpenAIService.generateTitle(newMessage);
        await prisma.chatSession.update({
          where: { id: session.id },
          data: { title: generatedTitle },
        });
        updatedTitle = generatedTitle;
      } catch (error) {
        console.error('Failed to generate title:', error);
        // Continue without renaming if title generation fails
      }
    }

    // Update session timestamp
    await prisma.chatSession.update({
      where: { id: session.id },
      data: { updatedAt: new Date() },
    });

    res.json({
      session: {
        id: session.id,
        title: updatedTitle,
      },
      userMessage,
      assistantMessage: aiMessage,
    });
  } catch (error) {
    console.error('Fork session error:', error);
    res.status(500).json({ error: 'Failed to fork session' });
  }
});

/**
 * PUT /api/chat/sessions/:id/rename
 * Rename chat session
 */
router.put('/sessions/:id/rename', requireAuth as any, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { title } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Valid title is required' });
    }

    // Verify session belongs to user
    const session = await prisma.chatSession.findFirst({
      where: { id, userId },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const updated = await prisma.chatSession.update({
      where: { id },
      data: { title: title.trim() },
    });

    res.json({ session: updated });
  } catch (error) {
    console.error('Rename session error:', error);
    res.status(500).json({ error: 'Failed to rename session' });
  }
});

/**
 * PUT /api/chat/sessions/:id/archive
 * Archive chat session (soft delete)
 */
router.put('/sessions/:id/archive', requireAuth as any, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    // Verify session belongs to user
    const session = await prisma.chatSession.findFirst({
      where: { id, userId },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await prisma.chatSession.update({
      where: { id },
      data: { isArchived: true },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Archive session error:', error);
    res.status(500).json({ error: 'Failed to archive session' });
  }
});

/**
 * PUT /api/chat/sessions/:id/unarchive
 * Unarchive chat session
 */
router.put('/sessions/:id/unarchive', requireAuth as any, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    // Verify session belongs to user
    const session = await prisma.chatSession.findFirst({
      where: { id, userId },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await prisma.chatSession.update({
      where: { id },
      data: { isArchived: false },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Unarchive session error:', error);
    res.status(500).json({ error: 'Failed to unarchive session' });
  }
});

/**
 * DELETE /api/chat/sessions/:id
 * Delete chat session (permanent)
 */
router.delete('/sessions/:id', requireAuth as any, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    // Verify session belongs to user
    const session = await prisma.chatSession.findFirst({
      where: { id, userId },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await prisma.chatSession.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

/**
 * POST /api/chat/claim-sessions
 * Claim anonymous sessions after login
 */
router.post('/claim-sessions', requireAuth as any, async (req: Request, res: Response): Promise<void> => {
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
router.get('/search', requireAuth as any, async (req: Request, res: Response): Promise<void> => {
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

/**
 * POST /api/chat/orchestrate
 * New orchestrated endpoint with OpenAI function calling + Fluentis + C1
 */
const orchestrateSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  sessionId: z.string().optional(),
});

/**
 * POST /api/chat/orchestrate/stream
 * Streaming version with SSE
 * NOTE: Must be defined BEFORE /orchestrate to avoid route matching issues
 */
router.post('/orchestrate/stream', requireAuth as any, validateBody(orchestrateSchema), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { message, sessionId } = req.body;

    let session;
    let conversationHistory: any[] = [];

    // Get or create session
    if (sessionId) {
      session = await prisma.chatSession.findFirst({
        where: {
          id: sessionId,
          userId,
          isArchived: false,
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 20,
          },
        },
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      conversationHistory = session.messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      }));
    } else {
      session = await prisma.chatSession.create({
        data: {
          userId,
          title: message.slice(0, 50),
        },
      });
    }

    // Save user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'user',
        content: message,
      },
    });

    // Setup SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send session ID and userMessageId first
    res.write(`data: ${JSON.stringify({ type: 'session', sessionId: session.id, userMessageId: userMessage.id })}\n\n`);

    let fullContent = '';
    let responseType = 'text';
    const toolCalls: any[] = [];

    // Stream orchestration
    for await (const chunk of orchestrationService.orchestrateStream(message, {
      conversationHistory,
      sessionId: session.id,
    })) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);

      if (chunk.type === 'ui_chunk' || chunk.type === 'text') {
        fullContent += typeof chunk.content === 'string' ? chunk.content : JSON.stringify(chunk.content);
      }

      if (chunk.type === 'ui_chunk') {
        responseType = 'ui';
      }

      if (chunk.type === 'tool_call') {
        toolCalls.push(chunk.content);
      }
    }

    // Save assistant response
    await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'assistant',
        content: fullContent,
        metadata: {
          type: responseType,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        },
      },
    });

    // Update session
    await prisma.chatSession.update({
      where: { id: session.id },
      data: { updatedAt: new Date() },
    });

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error('Orchestrate stream error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    res.end();
  }
});

/**
 * POST /api/chat/orchestrate
 * Non-streaming version (returns full response at once)
 */
router.post('/orchestrate', requireAuth as any, validateBody(orchestrateSchema), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { message, sessionId } = req.body;

    let session;
    let conversationHistory: any[] = [];

    // Get or create session
    if (sessionId) {
      session = await prisma.chatSession.findFirst({
        where: {
          id: sessionId,
          userId,
          isArchived: false,
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 20, // Context window: last 20 messages
          },
        },
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Build conversation history
      conversationHistory = session.messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      }));
    } else {
      // Create new session
      session = await prisma.chatSession.create({
        data: {
          userId,
          title: message.slice(0, 50), // Use first 50 chars as title
        },
      });
    }

    // Save user message
    await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'user',
        content: message,
      },
    });

    // Run orchestration
    const result = await orchestrationService.orchestrate(message, {
      conversationHistory,
      sessionId: session.id,
    });

    // Save assistant response
    const assistantMessage = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'assistant',
        content: result.content,
        metadata: result.toolCalls ? {
          type: result.type,
          toolCalls: result.toolCalls,
          hasData: !!result.data,
        } : undefined,
      },
    });

    // Update session timestamp
    await prisma.chatSession.update({
      where: { id: session.id },
      data: { updatedAt: new Date() },
    });

    res.json({
      sessionId: session.id,
      message: assistantMessage,
      type: result.type,
      toolCalls: result.toolCalls,
      data: result.data,
    });
  } catch (error: any) {
    console.error('Orchestrate error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
