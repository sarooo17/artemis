import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../services/token.service';
import { prisma } from '../config/database';

/**
 * Middleware to require authentication
 * Validates JWT access token and attaches user to request
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get access token from HttpOnly cookie (preferred) or Authorization header (fallback)
    const token = req.cookies.accessToken || 
                  (req.headers.authorization?.startsWith('Bearer ') 
                    ? req.headers.authorization.substring(7) 
                    : null);

    if (!token) {
      res.status(401).json({ error: 'Unauthorized', message: 'No token provided' });
      return;
    }

    const payload = TokenService.verifyAccessToken(token);

    if (!payload) {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
      return;
    }

    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      res.status(401).json({ error: 'Unauthorized', message: 'User not found' });
      return;
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Optional auth - doesn't fail if no token, just doesn't set user
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = TokenService.verifyAccessToken(token);

      if (payload) {
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
        });

        if (user) {
          req.user = user;
        }
      }
    }

    next();
  } catch (error) {
    next();
  }
}
