import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '../config/env';

/**
 * Generate a CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Middleware to generate and set CSRF token cookie
 * Should be called on login or when token is missing
 */
export function setCsrfToken(req: Request, res: Response, next: NextFunction): void {
  // Generate CSRF token
  const csrfToken = generateCsrfToken();
  
  // Set CSRF token in cookie (NOT HttpOnly, needs to be readable by JS)
  res.cookie('csrfToken', csrfToken, {
    httpOnly: false, // Client needs to read this
    secure: env.COOKIE_SECURE,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    domain: env.COOKIE_DOMAIN,
  });
  
  // Store token in response locals for use in this request
  res.locals.csrfToken = csrfToken;
  
  next();
}

/**
 * Middleware to verify CSRF token
 * Implements double-submit cookie pattern
 */
export function verifyCsrfToken(req: Request, res: Response, next: NextFunction): void {
  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }
  
  // Get token from cookie
  const cookieToken = req.cookies.csrfToken;
  
  // Get token from header (sent by client)
  const headerToken = req.headers['x-csrf-token'] as string;
  
  // Both must exist and match
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    res.status(403).json({ 
      error: 'Forbidden', 
      message: 'Invalid CSRF token' 
    });
    return;
  }
  
  next();
}

/**
 * Middleware to clear CSRF token
 */
export function clearCsrfToken(req: Request, res: Response, next: NextFunction): void {
  res.clearCookie('csrfToken', {
    httpOnly: false,
    secure: env.COOKIE_SECURE,
    sameSite: 'strict',
    domain: env.COOKIE_DOMAIN,
  });
  
  next();
}
