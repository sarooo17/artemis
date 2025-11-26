import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { SessionService } from './session.service';

export interface AccessTokenPayload {
  userId: string;
  email: string;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
  jti?: string; // JWT ID for session tracking
}

export class TokenService {
  /**
   * Generate access token (short-lived)
   */
  static generateAccessToken(payload: AccessTokenPayload): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as string,
    } as jwt.SignOptions);
  }

  /**
   * Generate refresh token (long-lived) and store in DB
   */
  static async generateRefreshToken(
    userId: string,
    metadata?: { ip?: string; userAgent?: string }
  ): Promise<string> {
    const tokenId = crypto.randomUUID();
    const jti = crypto.randomUUID(); // Unique JWT ID for session tracking
    
    const payload: RefreshTokenPayload = {
      userId,
      tokenId,
      jti,
    };

    const token = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as string,
    } as jwt.SignOptions);

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Store in database
    await prisma.refreshToken.create({
      data: {
        id: tokenId,
        token,
        userId,
        expiresAt,
      },
    });

    // Track session in Redis
    await SessionService.createSession(userId, jti, {
      ip: metadata?.ip,
      userAgent: metadata?.userAgent,
      createdAt: new Date(),
    });

    return token;
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): AccessTokenPayload | null {
    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
      return payload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Verify refresh token and check if it exists in DB and Redis
   */
  static async verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
    try {
      const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;

      // Check if token exists in database and is not expired
      const storedToken = await prisma.refreshToken.findUnique({
        where: { id: payload.tokenId },
      });

      if (!storedToken || storedToken.expiresAt < new Date()) {
        return null;
      }

      // Check if session is still valid in Redis (for immediate revocation)
      if (payload.jti) {
        const isValid = await SessionService.isSessionValid(payload.jti);
        if (!isValid) {
          console.log(`⚠️  Session ${payload.jti} revoked in Redis`);
          return null;
        }
      }

      return payload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Revoke refresh token (logout)
   */
  static async revokeRefreshToken(tokenId: string, jti?: string): Promise<void> {
    await prisma.refreshToken.delete({
      where: { id: tokenId },
    }).catch(() => {
      // Token might not exist, ignore error
    });

    // Revoke session in Redis
    if (jti) {
      await SessionService.revokeSession(jti);
    }
  }

  /**
   * Revoke all refresh tokens for a user
   */
  static async revokeAllUserTokens(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });

    // Revoke all sessions in Redis
    await SessionService.revokeAllUserSessions(userId);
  }

  /**
   * Clean up expired tokens (can be run periodically)
   */
  static async cleanupExpiredTokens(): Promise<number> {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }
}
