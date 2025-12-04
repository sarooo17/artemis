import { Router } from 'express';
import { prisma } from '../config/database';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Company/Department Switcher endpoints removed
// Context is now fixed to user's profile company/department
// Future: Can be re-enabled for multi-company/department support

export default router;
