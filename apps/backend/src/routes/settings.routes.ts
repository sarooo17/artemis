import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { invalidateContextCache } from '../middleware/context.middleware';
import { prisma } from '../config/database';
import { SessionService } from '../services/session.service';
import bcrypt from 'bcrypt';

const router = Router();

// Get user settings
router.get('/user', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;

    let settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await prisma.userSettings.create({
        data: { userId },
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('Error fetching user settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update user settings
router.put('/user', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;

    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: req.body,
      create: { userId, ...req.body },
    });

    // Invalida la cache del contesto quando cambiano le impostazioni
    await invalidateContextCache(userId);

    res.json(settings);
  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Get account information
router.get('/account', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        avatar: true,
        isEmailVerified: true,
        isTwoFactorEnabled: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching account info:', error);
    res.status(500).json({ error: 'Failed to fetch account information' });
  }
});

// Update account information
router.put('/account', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, phoneNumber, avatar } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { firstName, lastName, phoneNumber, avatar },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        avatar: true,
      },
    });

    // Invalida la cache del contesto quando cambia il nome
    await invalidateContextCache(userId);

    res.json(user);
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

// Change password
router.post('/account/change-password', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.hashedPassword) {
      return res.status(404).json({ error: 'User not found or no password set' });
    }

    const isValid = await bcrypt.compare(currentPassword, user.hashedPassword);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { hashedPassword },
    });

    await prisma.securityAuditLog.create({
      data: {
        userId,
        action: 'password_change',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Get company settings
router.get('/company', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.isCompanyOwner) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    if (!user.companyId) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
    });

    res.json(company);
  } catch (error) {
    console.error('Error fetching company settings:', error);
    res.status(500).json({ error: 'Failed to fetch company settings' });
  }
});

// Update company settings
router.put('/company', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.isCompanyOwner) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    if (!user.companyId) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const company = await prisma.company.update({
      where: { id: user.companyId },
      data: req.body,
    });

    res.json(company);
  } catch (error) {
    console.error('Error updating company settings:', error);
    res.status(500).json({ error: 'Failed to update company settings' });
  }
});

// Get security audit logs
router.get('/security/audit-logs', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit as string) || 50;

    const logs = await prisma.securityAuditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Get active sessions (from Redis + DB)
router.get('/security/sessions', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;

    // Get sessions from Redis (more detailed with IP, user agent)
    const redisSessions = await SessionService.getUserSessions(userId);

    // Get sessions from DB (fallback if Redis is down)
    const dbSessions = await prisma.refreshToken.findMany({
      where: { 
        userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    // Merge data: use Redis sessions if available, otherwise DB
    const sessions = redisSessions.length > 0 
      ? redisSessions.map(s => ({
          id: s.sessionId,
          createdAt: s.createdAt,
          ip: s.ip,
          userAgent: s.userAgent,
        }))
      : dbSessions;

    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Revoke session (both Redis and DB)
router.delete('/security/sessions/:sessionId', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;

    // Revoke in Redis (sessionId is the jti)
    await SessionService.revokeSession(sessionId);

    // Also try to find and delete from DB (tokenId might be different from jti)
    const session = await prisma.refreshToken.findFirst({
      where: {
        userId,
        // Note: DB uses tokenId, not jti. We might need to store jti in DB too
        // For now, this is best effort
      },
    });

    if (session) {
      await prisma.refreshToken.delete({
        where: { id: session.id },
      });
    }

    res.json({ message: 'Session revoked successfully' });
  } catch (error) {
    console.error('Error revoking session:', error);
    res.status(500).json({ error: 'Failed to revoke session' });
  }
});

export default router;
