import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../services/token.service';
import { prisma } from '../config/database';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    hashedPassword: string;
    firstName: string;
    lastName: string;
    role: string;
    companyId: string | null;
    isTwoFactorEnabled: boolean;
    twoFactorSecret: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
}

/**
 * Middleware to require authentication
 * Validates JWT access token and attaches user to request
 */
export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized', message: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

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
  req: AuthRequest,
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
