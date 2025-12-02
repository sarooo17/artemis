import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { prisma } from './config/database';
import { connectRedis, disconnectRedis } from './config/redis';
import { verifyCsrfToken } from './middleware/csrf.middleware';
import { requireAuth } from './middleware/auth.middleware';
import { contextBuilder } from './middleware/context.middleware';
import { userRateLimiter, authRateLimiter } from './middleware/rate-limit.middleware';
import authRoutes from './routes/auth.routes';
import chatRoutes from './routes/chat.routes';
import settingsRoutes from './routes/settings.routes';
import userRoutes from './routes/user.routes';
import searchRoutes from './routes/search.routes';
import dashboardRoutes from './routes/dashboard.routes';
import actionRoutes from './routes/action.routes';

const app: Express = express();

// Middleware
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true, // Allow cookies
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
// Auth routes: IP-based rate limiting (before authentication)
app.use('/api/auth', authRateLimiter, authRoutes);

// Protected routes: Per-user rate limiting (after authentication)
// Order: requireAuth → contextBuilder → userRateLimiter → verifyCsrfToken → route handler
app.use('/api/chat', requireAuth, contextBuilder, userRateLimiter, verifyCsrfToken, chatRoutes);
app.use('/api/settings', requireAuth, contextBuilder, userRateLimiter, verifyCsrfToken, settingsRoutes);
app.use('/api/user', requireAuth, contextBuilder, userRateLimiter, verifyCsrfToken, userRoutes);
app.use('/api/dashboard', requireAuth, contextBuilder, userRateLimiter, verifyCsrfToken, dashboardRoutes);
app.use('/api/actions', requireAuth, contextBuilder, userRateLimiter, verifyCsrfToken, actionRoutes); // Write operations
app.use('/api/search', requireAuth, contextBuilder, userRateLimiter, searchRoutes); // Read-only, no CSRF

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
const PORT = parseInt(env.PORT);

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected');

    // Connect to Redis (optional, continues without Redis if fails in dev)
    await connectRedis();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📝 Environment: ${env.NODE_ENV}`);
      console.log(`🔐 CORS enabled for: ${env.FRONTEND_URL}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down gracefully...');
  await prisma.$disconnect();
  await disconnectRedis();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n👋 Shutting down gracefully...');
  await prisma.$disconnect();
  await disconnectRedis();
  process.exit(0);
});

startServer();
