import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { prisma } from '../config/database';

const router = Router();

// Global search endpoint
router.get('/', requireAuth as any, async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!q || typeof q !== 'string') {
      return res.json({ results: [] });
    }

    const searchTerm = q.trim();
    if (searchTerm.length === 0) {
      return res.json({ results: [] });
    }

    // Get user to check their company and department access
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            department: true,
          },
        },
        company: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const results: any[] = [];

    // Search Chat Sessions (workspaces)
    const chatSessions = await prisma.chatSession.findMany({
      where: {
        userId: userId,
        OR: [
          { title: { contains: searchTerm } },
          { messages: { some: { content: { contains: searchTerm } } } },
        ],
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    chatSessions.forEach((chat) => {
      results.push({
        type: 'chat',
        id: chat.id,
        title: chat.title || 'New Chat',
        subtitle: `Updated ${new Date(chat.updatedAt).toLocaleDateString()}`,
        url: `/chat/${chat.id}`,
      });
    });

    // Search Users in the same company
    if (user.companyId) {
      const users = await prisma.user.findMany({
        where: {
          companyId: user.companyId,
          id: { not: userId }, // Exclude current user
          OR: [
            { firstName: { contains: searchTerm } },
            { lastName: { contains: searchTerm } },
            { email: { contains: searchTerm } },
          ],
        },
        include: {
          role: {
            include: {
              department: true,
            },
          },
        },
        take: 10,
      });

      users.forEach((u) => {
        results.push({
          type: 'user',
          id: u.id,
          title: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
          subtitle: u.role?.department?.name || 'No department',
          email: u.email,
        });
      });
    }

    // Search Departments (only if user is in a company)
    if (user.companyId) {
      const departments = await prisma.department.findMany({
        where: {
          companyId: user.companyId,
          OR: [
            { name: { contains: searchTerm } },
            { description: { contains: searchTerm } },
          ],
        },
        include: {
          roles: {
            select: { id: true },
          },
        },
        take: 5,
      });

      departments.forEach((dept) => {
        results.push({
          type: 'department',
          id: dept.id,
          title: dept.name,
          subtitle: dept.description || `${dept.roles.length} roles`,
        });
      });
    }

    // Search Companies (only if user has access to multiple companies or is searching their own)
    const companies = await prisma.company.findMany({
      where: {
        OR: [
          { id: user.companyId || '' },
          { users: { some: { id: userId } } },
        ],
        AND: {
          OR: [
            { name: { contains: searchTerm } },
            { domain: { contains: searchTerm } },
          ],
        },
      },
      include: {
        users: {
          select: { id: true },
        },
        departments: {
          select: { id: true },
        },
      },
      take: 5,
    });

    companies.forEach((company) => {
      results.push({
        type: 'company',
        id: company.id,
        title: company.name,
        subtitle: `${company.users.length} users • ${company.departments.length} departments`,
      });
    });

    // Sort results: chats first, then users, then departments, then companies
    const sortOrder = { chat: 0, user: 1, department: 2, company: 3 };
    results.sort((a, b) => sortOrder[a.type as keyof typeof sortOrder] - sortOrder[b.type as keyof typeof sortOrder]);

    res.json({ results });
  } catch (error) {
    console.error('Global search error:', error);
    res.status(500).json({ error: 'Internal server error during search' });
  }
});

export default router;
