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
  currentUIContent: z.string().optional(), // Current UI for incremental updates
});

/**
 * POST /api/chat/orchestrate/stream
 * Streaming version with SSE
 * NOTE: Must be defined BEFORE /orchestrate to avoid route matching issues
 */
router.post('/orchestrate/stream', requireAuth as any, validateBody(orchestrateSchema), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { message, sessionId, currentUIContent } = req.body;

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
    let layoutIntent: 'full' | 'extended' | 'preview' | 'hidden' = 'extended'; // Default
    const toolCalls: any[] = [];
    let summaryMessage = ''; // Track summary message for UI responses

    // Stream orchestration
    for await (const chunk of orchestrationService.orchestrateStream(message, {
      conversationHistory,
      sessionId: session.id,
      context: req.context, // Pass request context
      currentUIContent, // Pass existing UI for incremental updates
    })) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);

      if (chunk.type === 'ui_chunk' || chunk.type === 'text') {
        fullContent += typeof chunk.content === 'string' ? chunk.content : JSON.stringify(chunk.content);
      }

      if (chunk.type === 'ui_chunk') {
        responseType = 'ui';
        layoutIntent = 'hidden'; // Default for UI responses
      }

      if (chunk.type === 'summary_message') {
        summaryMessage = chunk.content; // Save summary message for UI responses
      }

      if (chunk.type === 'tool_call') {
        toolCalls.push(chunk.content);
      }
    }

    // Determine final layoutIntent based on response type
    // This could be enhanced to parse from AI response in future
    if (responseType === 'ui') {
      layoutIntent = 'hidden'; // UI should take center stage
    } else if (toolCalls.length > 0) {
      layoutIntent = 'extended'; // Data responses with tools
    } else {
      layoutIntent = 'full'; // Pure conversational responses
    }

    // Save assistant response
    if (responseType === 'text') {
      // For text responses, save the full content
      await prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          role: 'assistant',
          content: fullContent,
          metadata: {
            type: responseType,
            layoutIntent, // Save layoutIntent in metadata
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          },
        },
      });
    } else if (responseType === 'ui') {
      // For UI responses, save the summary message (or a default message if not provided)
      // The full UI content is saved via the separate /ui-snapshots endpoint
      const contentToSave = summaryMessage || 'Ho generato un\'interfaccia interattiva per visualizzare i dati.';
      await prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          role: 'assistant',
          content: contentToSave,
          metadata: {
            type: 'text', // Save as text so it appears in chat history
            layoutIntent,
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
            uiResponse: true, // Flag to indicate this is a summary of a UI response
          },
        },
      });
      console.log('💬 UI response saved to chat history:', summaryMessage ? 'with summary' : 'with default message');
    }

    // Generate title if it's a new session (no conversation history)
    if (conversationHistory.length === 0) {
      try {
        const generatedTitle = await OpenAIService.generateTitle(message);
        await prisma.chatSession.update({
          where: { id: session.id },
          data: { 
            title: generatedTitle,
            updatedAt: new Date() 
          },
        });
        console.log(`🏷️  Session title updated: "${generatedTitle}"`);
        
        // Send title update event to frontend
        res.write(`data: ${JSON.stringify({ type: 'title_update', title: generatedTitle })}\n\n`);
      } catch (error) {
        console.error('❌ Failed to generate title:', error);
        // Update timestamp anyway
        await prisma.chatSession.update({
          where: { id: session.id },
          data: { updatedAt: new Date() },
        });
      }
    } else {
      // Update session timestamp
      await prisma.chatSession.update({
        where: { id: session.id },
        data: { updatedAt: new Date() },
      });
    }

    res.write(`data: ${JSON.stringify({ type: 'done', layoutIntent })}\n\n`);
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

/**
 * GET /api/chat/context
 * Debug endpoint: Visualizza il contesto corrente della richiesta
 */
router.get('/context', requireAuth as any, async (req: Request, res: Response) => {
  try {
    // Il context è già stato iniettato dal middleware contextBuilder
    const context = req.context;

    if (!context) {
      return res.status(500).json({ error: 'Context not available' });
    }

    res.json({
      message: 'Request context successfully built',
      context,
    });
  } catch (error) {
    console.error('Context debug error:', error);
    res.status(500).json({ error: 'Failed to retrieve context' });
  }
});

// ========================================
// UI SNAPSHOTS - Git-Style Branching
// ========================================

const saveSnapshotSchema = z.object({
  messageId: z.string().uuid(),
  content: z.string().min(1),
  branchName: z.string().default('main'),
  parentId: z.string().uuid().nullable().optional(),
  metadata: z.object({
    toolCalls: z.array(z.any()).optional(),
    summaryMessage: z.string().optional(),
    dataPreview: z.any().optional(),
    generationTime: z.number().optional(),
    tokenCount: z.number().optional(),
  }).optional(),
});

/**
 * POST /api/chat/sessions/:id/ui-snapshots
 * Save a new UI snapshot for a session
 */
router.post('/sessions/:id/ui-snapshots', requireAuth as any, validateBody(saveSnapshotSchema), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const sessionId = req.params.id;
    const { messageId, content, branchName, parentId, metadata } = req.body;

    // Verify session belongs to user
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Verify message exists in session
    const message = await prisma.chatMessage.findFirst({
      where: { id: messageId, sessionId },
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Get current snapshot count for this branch
    const snapshotCount = await prisma.uISnapshot.count({
      where: { sessionId, branchName },
    });

    // Soft limit warning (50 per branch)
    if (snapshotCount >= 50) {
      console.warn(`[UI Snapshots] Branch "${branchName}" in session ${sessionId} has ${snapshotCount} snapshots (soft limit: 50)`);
    }

    // Create snapshot
    const snapshot = await prisma.uISnapshot.create({
      data: {
        sessionId,
        messageId,
        branchName,
        parentId,
        content,
        layoutIntent: 'hidden', // layoutIntent è per AI response bar, non per workspace UI
        snapshotIndex: snapshotCount,
        metadata: metadata || {},
        isActive: true,
      },
    });

    res.status(201).json({ snapshot });
  } catch (error) {
    console.error('Save UI snapshot error:', error);
    res.status(500).json({ error: 'Failed to save UI snapshot' });
  }
});

/**
 * GET /api/chat/sessions/:id/ui-snapshots
 * Get UI snapshots for a session (optionally filtered by branch)
 */
router.get('/sessions/:id/ui-snapshots', requireAuth as any, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const sessionId = req.params.id;
    const branchName = (req.query.branch as string) || 'main';

    // Verify session belongs to user
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get snapshots for this branch
    const snapshots = await prisma.uISnapshot.findMany({
      where: {
        sessionId,
        branchName,
      },
      orderBy: { snapshotIndex: 'asc' },
      include: {
        message: {
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true,
          },
        },
      },
    });

    res.json({ snapshots, branchName });
  } catch (error) {
    console.error('Get UI snapshots error:', error);
    res.status(500).json({ error: 'Failed to get UI snapshots' });
  }
});

/**
 * GET /api/chat/sessions/:id/ui-snapshots/branches
 * List all branches for a session with metadata
 */
router.get('/sessions/:id/ui-snapshots/branches', requireAuth as any, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const sessionId = req.params.id;

    // Verify session belongs to user
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get all unique branches with counts
    const branches = await prisma.uISnapshot.groupBy({
      by: ['branchName'],
      where: { sessionId },
      _count: { id: true },
      _max: { createdAt: true },
    });

    // Get fork points (messages that have multiple child snapshots on different branches)
    const forkPoints = await prisma.$queryRaw`
      SELECT DISTINCT s1.message_id, s1.branch_name as from_branch, s2.branch_name as to_branch
      FROM ui_snapshots s1
      JOIN ui_snapshots s2 ON s1.message_id = s2.message_id 
      WHERE s1.session_id = ${sessionId} 
        AND s2.session_id = ${sessionId}
        AND s1.branch_name != s2.branch_name
    ` as any[];

    const result = branches.map(b => ({
      name: b.branchName,
      snapshotCount: b._count.id,
      lastUpdate: b._max.createdAt,
      isActive: b.branchName === 'main', // main is always active
    }));

    res.json({ branches: result, forkPoints });
  } catch (error) {
    console.error('Get branches error:', error);
    res.status(500).json({ error: 'Failed to get branches' });
  }
});

/**
 * PATCH /api/chat/sessions/:id/ui-snapshots/bulk
 * Update multiple snapshots (used for marking old branch as inactive when forking)
 */
router.patch('/sessions/:id/ui-snapshots/bulk', requireAuth as any, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const sessionId = req.params.id;
    const { snapshotIds, isActive } = req.body;

    if (!Array.isArray(snapshotIds) || typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'snapshotIds (array) and isActive (boolean) are required' });
    }

    // Verify session belongs to user
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Update snapshots
    const result = await prisma.uISnapshot.updateMany({
      where: {
        id: { in: snapshotIds },
        sessionId, // Security: ensure snapshots belong to this session
      },
      data: { isActive },
    });

    res.json({ updated: result.count });
  } catch (error) {
    console.error('Bulk update UI snapshots error:', error);
    res.status(500).json({ error: 'Failed to update UI snapshots' });
  }
});

/**
 * DELETE /api/chat/sessions/:id/ui-snapshots/:snapshotId
 * Delete a specific UI snapshot (used for cleanup)
 */
router.delete('/sessions/:id/ui-snapshots/:snapshotId', requireAuth as any, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id: sessionId, snapshotId } = req.params;

    // Verify session belongs to user
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Delete snapshot
    await prisma.uISnapshot.delete({
      where: {
        id: snapshotId,
        sessionId, // Security: ensure snapshot belongs to this session
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete UI snapshot error:', error);
    res.status(500).json({ error: 'Failed to delete UI snapshot' });
  }
});

export default router;
