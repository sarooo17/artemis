import { createClient } from 'redis';
import { env } from './env';

// Redis client for session tracking
const redis = createClient({
  url: env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      // In development, stop retrying quickly
      if (env.NODE_ENV === 'development' && retries > 3) {
        return new Error('Redis not available');
      }
      // In production, retry more aggressively
      if (retries > 10) {
        console.error('❌ Redis: Max reconnection attempts reached');
        return new Error('Redis connection failed');
      }
      return Math.min(retries * 100, 3000);
    },
  },
});

redis.on('error', (err) => {
  // Only log in production or if verbose
  if (env.NODE_ENV === 'production') {
    console.error('❌ Redis error:', err.message);
  }
});

redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('ready', () => {
  console.log('✅ Redis ready');
});

redis.on('reconnecting', () => {
  if (env.NODE_ENV === 'production') {
    console.log('🔄 Redis reconnecting...');
  }
});

// Connect to Redis
let isConnected = false;

export async function connectRedis() {
  if (!isConnected) {
    try {
      await redis.connect();
      isConnected = true;
    } catch (error: any) {
      // Silent in development if Redis is not running
      if (env.NODE_ENV === 'development') {
        console.log('ℹ️  Redis not available (session tracking disabled)');
      } else {
        console.error('❌ Failed to connect to Redis:', error.message);
        throw error;
      }
    }
  }
}

export async function disconnectRedis() {
  if (isConnected) {
    await redis.disconnect();
    isConnected = false;
  }
}

export { redis, isConnected };
