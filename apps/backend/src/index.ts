import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { prisma } from './config/database';
import authRoutes from './routes/auth.routes';
import chatRoutes from './routes/chat.routes';
import settingsRoutes from './routes/settings.routes';
import userRoutes from './routes/user.routes';
import searchRoutes from './routes/search.routes';
import dashboardRoutes from './routes/dashboard.routes';

const app: Express = express();

// Rate limiting - più permissivo in development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'production' ? 100 : 1000, // 1000 requests in dev, 100 in production
  message: 'Too many requests from this IP, please try again later.',
});

// Middleware
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true, // Allow cookies
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/api/', limiter);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/user', userRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/dashboard', dashboardRoutes);

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
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n👋 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
