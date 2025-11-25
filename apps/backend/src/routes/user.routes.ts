import { Router } from 'express';
import { prisma } from '../config/database';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Get available companies and departments for the user
router.get('/available-contexts', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;

    // Get user with their current company and role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: {
          include: {
            departments: {
              include: {
                roles: true,
              },
            },
          },
        },
        role: {
          include: {
            department: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // For now, user can only access their own company
    // In future, could implement multi-company access
    const availableCompanies = user.company ? [
      {
        id: user.company.id,
        name: user.company.name,
        logo: user.company.logo,
      }
    ] : [];

    // Get all departments in the user's company
    const availableDepartments = user.company?.departments.map((dept: any) => ({
      id: dept.id,
      name: dept.name,
      description: dept.description,
    })) || [];

    res.json({
      currentContext: {
        companyId: user.companyId,
        companyName: user.company?.name,
        departmentId: user.role?.departmentId,
        departmentName: user.role?.department?.name,
        roleId: user.roleId,
        roleName: user.role?.name,
      },
      availableCompanies,
      availableDepartments,
    });
  } catch (error) {
    console.error('Error fetching available contexts:', error);
    res.status(500).json({ error: 'Failed to fetch available contexts' });
  }
});

// Switch user's company and/or department
router.post('/switch-context', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { companyId, departmentId, roleId } = req.body;

    // Validate that user has access to the requested company
    const user: any = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // For now, only allow switching within same company
    if (companyId && companyId !== user.companyId) {
      return res.status(403).json({ error: 'Cannot switch to a different company' });
    }

    // Handle department switching
    let newRoleId = roleId;
    let updatedUser: any = user;
    
    // If departmentId is "all", we don't change the user's role - it's just a UI context
    if (departmentId && departmentId !== 'all') {
      // Verify department exists and belongs to user's company
      const department: any = await prisma.department.findFirst({
        where: {
          id: departmentId,
          companyId: user.companyId || undefined,
        },
        include: {
          roles: true,
        },
      });

      if (!department) {
        return res.status(404).json({ error: 'Department not found or not accessible' });
      }

      // If no specific role provided, try to find a suitable role in the new department
      if (!newRoleId && department.roles.length > 0) {
        // Get the first available role in the department
        newRoleId = department.roles[0].id;
      }

      // Update user's role (which is linked to a department)
      updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          roleId: newRoleId || user.roleId,
        },
        include: {
          company: true,
          role: {
            include: {
              department: true,
            },
          },
        },
      });
    } else {
      // For "all departments", just fetch user data without updating
      updatedUser = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          company: true,
          role: {
            include: {
              department: true,
            },
          },
        },
      });
    }

    // Log the context switch in audit log (only if actually changed role)
    if (departmentId !== 'all') {
      await prisma.securityAuditLog.create({
        data: {
          userId: userId,
          action: 'context_switch',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          metadata: {
            previousRoleId: user.roleId,
            newRoleId: updatedUser.roleId,
            departmentId: departmentId,
          },
        },
      });
    }

    // Prepare response based on context
    let responseDepartmentId = departmentId;
    let responseDepartmentName = 'All departments';

    if (departmentId === 'all') {
      // Keep "all" as a special context indicator
      responseDepartmentId = 'all';
      responseDepartmentName = 'All departments';
    } else if (updatedUser.role?.department) {
      responseDepartmentId = updatedUser.role.departmentId;
      responseDepartmentName = updatedUser.role.department.name;
    }

    res.json({
      message: 'Context switched successfully',
      currentContext: {
        companyId: updatedUser.companyId,
        companyName: updatedUser.company?.name,
        departmentId: responseDepartmentId,
        departmentName: responseDepartmentName,
        roleId: updatedUser.roleId,
        roleName: updatedUser.role?.name,
      },
    });
  } catch (error) {
    console.error('Error switching context:', error);
    res.status(500).json({ error: 'Failed to switch context' });
  }
});

export default router;
