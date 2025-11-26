import { redis, isConnected } from '../config/redis';
import { env } from '../config/env';

/**
 * Session tracking service using Redis
 * Tracks active user sessions for immediate revocation
 */
export class SessionService {
  private static readonly SESSION_PREFIX = 'session:';
  private static readonly USER_SESSIONS_PREFIX = 'user_sessions:';
  
  // TTL matches refresh token expiration (7 days)
  private static readonly SESSION_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

  /**
   * Create a new session in Redis
   * @param userId - User ID
   * @param sessionId - Unique session identifier (from refresh token jti)
   * @param metadata - Additional session info (IP, user agent, etc.)
   */
  static async createSession(
    userId: string,
    sessionId: string,
    metadata: {
      ip?: string;
      userAgent?: string;
      createdAt?: Date;
    } = {}
  ): Promise<void> {
    if (!isConnected) {
      console.warn('⚠️  Redis not connected, session not tracked');
      return;
    }

    try {
      const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
      const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;

      // Store session data
      const sessionData = {
        userId,
        ip: metadata.ip || 'unknown',
        userAgent: metadata.userAgent || 'unknown',
        createdAt: metadata.createdAt?.toISOString() || new Date().toISOString(),
      };

      // Set session with TTL
      await redis.setEx(sessionKey, this.SESSION_TTL, JSON.stringify(sessionData));

      // Add to user's session set
      await redis.sAdd(userSessionsKey, sessionId);
      await redis.expire(userSessionsKey, this.SESSION_TTL);

      console.log(`✅ Session created: ${sessionId} for user ${userId}`);
    } catch (error) {
      console.error('❌ Failed to create session:', error);
      // Don't throw - session tracking is optional
    }
  }

  /**
   * Check if a session exists and is valid
   * @param sessionId - Session identifier to check
   * @returns true if session exists
   */
  static async isSessionValid(sessionId: string): Promise<boolean> {
    if (!isConnected) {
      // Without Redis, we rely on JWT expiration only
      return true;
    }

    try {
      const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
      const exists = await redis.exists(sessionKey);
      return exists === 1;
    } catch (error) {
      console.error('❌ Failed to check session:', error);
      // On error, assume valid (fail open)
      return true;
    }
  }

  /**
   * Revoke a specific session
   * @param sessionId - Session identifier to revoke
   */
  static async revokeSession(sessionId: string): Promise<void> {
    if (!isConnected) {
      console.warn('⚠️  Redis not connected, cannot revoke session');
      return;
    }

    try {
      const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
      
      // Get session data to find userId
      const sessionData = await redis.get(sessionKey);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${session.userId}`;
        
        // Remove from user's session set
        await redis.sRem(userSessionsKey, sessionId);
      }

      // Delete session
      await redis.del(sessionKey);
      
      console.log(`✅ Session revoked: ${sessionId}`);
    } catch (error) {
      console.error('❌ Failed to revoke session:', error);
    }
  }

  /**
   * Revoke all sessions for a user
   * @param userId - User ID whose sessions to revoke
   */
  static async revokeAllUserSessions(userId: string): Promise<void> {
    if (!isConnected) {
      console.warn('⚠️  Redis not connected, cannot revoke sessions');
      return;
    }

    try {
      const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;
      
      // Get all session IDs for this user
      const sessionIds = await redis.sMembers(userSessionsKey);
      
      if (sessionIds.length === 0) {
        console.log(`ℹ️  No active sessions found for user ${userId}`);
        return;
      }

      // Delete all sessions
      const deletePromises = sessionIds.map(sessionId => 
        redis.del(`${this.SESSION_PREFIX}${sessionId}`)
      );
      await Promise.all(deletePromises);

      // Clear user's session set
      await redis.del(userSessionsKey);

      console.log(`✅ Revoked ${sessionIds.length} sessions for user ${userId}`);
    } catch (error) {
      console.error('❌ Failed to revoke user sessions:', error);
    }
  }

  /**
   * Get all active sessions for a user
   * @param userId - User ID
   * @returns Array of session data
   */
  static async getUserSessions(userId: string): Promise<any[]> {
    if (!isConnected) {
      return [];
    }

    try {
      const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;
      const sessionIds = await redis.sMembers(userSessionsKey);

      if (sessionIds.length === 0) {
        return [];
      }

      // Get all session data
      const sessions = await Promise.all(
        sessionIds.map(async (sessionId) => {
          const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
          const data = await redis.get(sessionKey);
          if (data) {
            return { sessionId, ...JSON.parse(data) };
          }
          return null;
        })
      );

      return sessions.filter(s => s !== null);
    } catch (error) {
      console.error('❌ Failed to get user sessions:', error);
      return [];
    }
  }

  /**
   * Clean up expired sessions for a user
   * @param userId - User ID
   */
  static async cleanupUserSessions(userId: string): Promise<void> {
    if (!isConnected) {
      return;
    }

    try {
      const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;
      const sessionIds = await redis.sMembers(userSessionsKey);

      // Check each session and remove if expired
      for (const sessionId of sessionIds) {
        const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
        const exists = await redis.exists(sessionKey);
        
        if (exists === 0) {
          // Session expired, remove from set
          await redis.sRem(userSessionsKey, sessionId);
        }
      }
    } catch (error) {
      console.error('❌ Failed to cleanup sessions:', error);
    }
  }
}
