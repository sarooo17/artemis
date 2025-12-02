import { User as PrismaUser } from '@prisma/client';
import { RequestContext } from './context.types';

declare global {
  namespace Express {
    interface User extends PrismaUser {}
    
    interface Request {
      user?: PrismaUser;
      context?: RequestContext;
      rateLimit?: {
        limit: number;
        current: number;
        remaining: number;
        resetTime?: Date;
      };
    }
  }
}

export {};
