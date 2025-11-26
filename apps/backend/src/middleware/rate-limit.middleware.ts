import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { env } from '../config/env';

/**
 * Per-user rate limiting
 * Tracks requests by userId (from req.user) instead of IP address
 * Must be used AFTER requireAuth middleware
 */
export const userRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'production' ? 100 : 1000, // 1000 in dev, 100 in prod
  message: 'Too many requests from this account, please try again later.',
  
  // Use userId as key instead of IP
  keyGenerator: (req: Request) => {
    // If user is authenticated, use their ID
    if (req.user?.id) {
      return `user:${req.user.id}`;
    }
    // Fallback to IP for unauthenticated requests (shouldn't happen if used after requireAuth)
    return req.ip || 'unknown';
  },
  
  // Custom handler for better error messages
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests from this account, please try again later.',
      retryAfter: req.rateLimit?.resetTime || new Date(Date.now() + 15 * 60 * 1000),
    });
  },
});

/**
 * IP-based rate limiting for authentication endpoints
 * Used before authentication to prevent brute force
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'production' ? 20 : 100, // Stricter limit for auth
  message: 'Too many authentication attempts from this IP, please try again later.',
  
  skipSuccessfulRequests: true, // Only count failed attempts
});
