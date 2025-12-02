import { z } from 'zod';

/**
 * UI Context validation schema
 */
export const uiContextSchema = z.object({
  currentRoute: z.string().optional(),
  entityId: z.string().optional(),
  entityType: z.string().optional(),
  filters: z.record(z.any()).optional(),
  layoutMode: z.enum(['immersive', 'split', 'minimized']).optional(),
  viewportWidth: z.number().positive().optional(),
  viewportHeight: z.number().positive().optional(),
}).optional();

/**
 * Settings validation schemas
 */

export const updateGeneralSettingsSchema = z.object({
  language: z.enum(['en', 'it', 'es', 'fr', 'de']).optional(),
  timezone: z.string().optional(),
  dateFormat: z.string().optional(),
  timeFormat: z.enum(['12h', '24h']).optional(),
});

export const updateNotificationSettingsSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  notificationFrequency: z.enum(['instant', 'hourly', 'daily', 'weekly']).optional(),
});

export const updateSecuritySettingsSchema = z.object({
  currentPassword: z.string().min(8).optional(),
  newPassword: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, 
    'Password must contain at least 8 characters, one uppercase, one lowercase, one number and one special character').optional(),
  confirmPassword: z.string().optional(),
  twoFactorEnabled: z.boolean().optional(),
}).refine((data) => {
  if (data.newPassword && data.newPassword !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

/**
 * Dashboard validation schemas
 */

export const createCategorySchema = z.object({
  name: z.string().min(1).max(50),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(50).optional(),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  order: z.number().int().min(0).optional(),
});

export const createWidgetSchema = z.object({
  dashboardId: z.string().uuid(),
  type: z.enum(['metric', 'chart', 'table', 'list']),
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  config: z.record(z.any()).optional(),
  data: z.record(z.any()).optional(),
  position: z.object({
    x: z.number().int().min(0),
    y: z.number().int().min(0),
    w: z.number().int().min(1),
    h: z.number().int().min(1),
  }).optional(),
});

/**
 * Chat validation schemas
 */

export const sendMessageSchema = z.object({
  sessionId: z.string().optional(),
  message: z.string().min(1).max(10000),
  uiContext: uiContextSchema,
});

export const forkChatSchema = z.object({
  messageId: z.string().uuid(),
  newMessage: z.string().min(1).max(10000),
});

export const updateSessionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  isArchived: z.boolean().optional(),
});

/**
 * User validation schemas
 */

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
  avatar: z.string().url().optional(),
});

export const updateContextSchema = z.object({
  companyId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional().nullable(),
});
