import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// Get all categories for current user
router.get('/categories', requireAuth as any, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    // Check if Overview category exists
    const overviewExists = await prisma.dashboardCategory.findFirst({
      where: { userId, isDefault: true },
    });

    // Create Overview if it doesn't exist
    if (!overviewExists) {
      await prisma.dashboardCategory.create({
        data: {
          userId,
          name: 'Overview',
          icon: '📊',
          order: 0,
          isDefault: true,
        },
      });
    }

    const categories = await prisma.dashboardCategory.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { order: 'asc' }], // Overview sempre prima
      include: {
        dashboards: {
          orderBy: { order: 'asc' },
          include: {
            widgets: true,
          },
        },
      },
    });

    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create a new category
router.post('/categories', requireAuth as any, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { name, icon } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // Get max order
    const maxOrder = await prisma.dashboardCategory.findFirst({
      where: { userId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const category = await prisma.dashboardCategory.create({
      data: {
        userId,
        name,
        icon: icon || '📊',
        order: (maxOrder?.order || 0) + 1,
      },
    });

    res.json({ category });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category
router.put('/categories/:id', requireAuth as any, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { name, icon, order } = req.body;

    // Verify ownership
    const existing = await prisma.dashboardCategory.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const category = await prisma.dashboardCategory.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(icon && { icon }),
        ...(order !== undefined && { order }),
      },
    });

    res.json({ category });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category
router.delete('/categories/:id', requireAuth as any, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    // Verify ownership and not default
    const existing = await prisma.dashboardCategory.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    if (existing.isDefault) {
      return res.status(400).json({ error: 'Cannot delete default category' });
    }

    await prisma.dashboardCategory.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Create a new dashboard
router.post('/dashboards', requireAuth as any, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { categoryId, name, description } = req.body;

    if (!categoryId || !name) {
      return res.status(400).json({ error: 'Category ID and name are required' });
    }

    // Verify category ownership
    const category = await prisma.dashboardCategory.findFirst({
      where: { id: categoryId, userId },
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Get max order
    const maxOrder = await prisma.dashboard.findFirst({
      where: { categoryId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const dashboard = await prisma.dashboard.create({
      data: {
        categoryId,
        userId,
        name,
        description,
        order: (maxOrder?.order || 0) + 1,
      },
    });

    res.json({ dashboard });
  } catch (error) {
    console.error('Create dashboard error:', error);
    res.status(500).json({ error: 'Failed to create dashboard' });
  }
});

// Save widget from chat
router.post('/widgets/save-from-chat', requireAuth as any, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { dashboardId, chatSessionId, type, title, description, config, data, position } = req.body;

    if (!dashboardId || !type || !title || !data) {
      return res.status(400).json({ error: 'Dashboard ID, type, title, and data are required' });
    }

    // Verify dashboard ownership
    const dashboard = await prisma.dashboard.findFirst({
      where: { id: dashboardId, userId },
    });

    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    const widget = await prisma.dashboardWidget.create({
      data: {
        dashboardId,
        chatSessionId,
        type,
        title,
        description,
        config: config || {},
        data,
        position: position || { x: 0, y: 0, w: 4, h: 3 },
      },
    });

    res.json({ widget });
  } catch (error) {
    console.error('Save widget error:', error);
    res.status(500).json({ error: 'Failed to save widget' });
  }
});

// Update widget
router.put('/widgets/:id', requireAuth as any, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { title, description, config, data, position } = req.body;

    // Verify ownership through dashboard
    const existing = await prisma.dashboardWidget.findFirst({
      where: {
        id,
        dashboard: { userId },
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    const widget = await prisma.dashboardWidget.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(config && { config }),
        ...(data && { data }),
        ...(position && { position }),
      },
    });

    res.json({ widget });
  } catch (error) {
    console.error('Update widget error:', error);
    res.status(500).json({ error: 'Failed to update widget' });
  }
});

// Delete widget
router.delete('/widgets/:id', requireAuth as any, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    // Verify ownership through dashboard
    const existing = await prisma.dashboardWidget.findFirst({
      where: {
        id,
        dashboard: { userId },
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    await prisma.dashboardWidget.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete widget error:', error);
    res.status(500).json({ error: 'Failed to delete widget' });
  }
});

// Delete dashboard
router.delete('/dashboards/:id', requireAuth as any, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    // Verify ownership
    const existing = await prisma.dashboard.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    await prisma.dashboard.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete dashboard error:', error);
    res.status(500).json({ error: 'Failed to delete dashboard' });
  }
});

export default router;
