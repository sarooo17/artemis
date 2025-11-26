import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { PasswordService } from '../services/password.service';
import { TokenService } from '../services/token.service';
import { validateBody } from '../middleware/validation.middleware';
import { requireAuth } from '../middleware/auth.middleware';
import { setCsrfToken, verifyCsrfToken, clearCsrfToken } from '../middleware/csrf.middleware';
import { env } from '../config/env';

const router = Router();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().optional(), // Can come from cookie or body
});

/**
 * POST /api/auth/login
 * Authenticate user and return tokens
 */
router.post('/login', validateBody(loginSchema), setCsrfToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials', message: 'Email or password is incorrect' });
      return;
    }

    // Verify password
    const isValid = await PasswordService.verify(password, user.hashedPassword);

    if (!isValid) {
      res.status(401).json({ error: 'Invalid credentials', message: 'Email or password is incorrect' });
      return;
    }

    // Generate tokens with session metadata
    const accessToken = TokenService.generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    const refreshToken = await TokenService.generateRefreshToken(user.id, {
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    // Set refresh token in HttpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: env.COOKIE_SECURE, // true in production
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      domain: env.COOKIE_DOMAIN,
    });

    // Set access token in HttpOnly cookie
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
      domain: env.COOKIE_DOMAIN,
    });

    // Return user data only (no tokens in body)
    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', requireAuth as any, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        companyId: true,
        isTwoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    // Get refresh token from cookie or body
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      res.status(401).json({ error: 'Unauthorized', message: 'No refresh token provided' });
      return;
    }

    // Verify refresh token
    const payload = await TokenService.verifyRefreshToken(refreshToken);

    if (!payload) {
      // Clear invalid cookie
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: 'strict',
        domain: env.COOKIE_DOMAIN,
      });
      
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired refresh token' });
      return;
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true },
    });

    if (!user) {
      res.status(401).json({ error: 'Unauthorized', message: 'User not found' });
      return;
    }

    // Generate new access token
    const accessToken = TokenService.generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    // Rotate refresh token (recommended for security)
    await TokenService.revokeRefreshToken(payload.tokenId, payload.jti);
    const newRefreshToken = await TokenService.generateRefreshToken(user.id, {
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    // Update cookie with new refresh token
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      domain: env.COOKIE_DOMAIN,
    });

    // Set new access token in HttpOnly cookie
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
      domain: env.COOKIE_DOMAIN,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/logout
 * Logout user and invalidate refresh token
 */
router.post('/logout', verifyCsrfToken, clearCsrfToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      // Verify and get token ID
      const payload = await TokenService.verifyRefreshToken(refreshToken);
      
      if (payload) {
        // Revoke token and Redis session
        await TokenService.revokeRefreshToken(payload.tokenId, payload.jti);
      }
    }

    // Clear both cookies
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: 'strict',
      domain: env.COOKIE_DOMAIN,
    });
    
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: 'strict',
      domain: env.COOKIE_DOMAIN,
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
