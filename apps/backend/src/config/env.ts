import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  FRONTEND_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  COOKIE_DOMAIN: z.string().default('localhost'),
  COOKIE_SECURE: z.string().transform((val) => val === 'true').default('false'),
  
  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),
  
  // Email configuration
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().default('587'),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM: z.string().email().default('noreply@artemis.app'),
  
  // External APIs (optional)
  CLEARBIT_API_KEY: z.string().optional(),
  VIES_API_URL: z.string().default('https://ec.europa.eu/taxation_customs/vies/services/checkVatService'),
  
  // OpenAI
  OPENAI_API_KEY: z.string().min(1),
  
  // Thesys C1
  THESYS_API_KEY: z.string().min(1),
  
  // Fluentis ERP
  FLUENTIS_BASE_URL: z.string().url(),
  FLUENTIS_USER: z.string().min(1),
  FLUENTIS_PASSWORD: z.string().min(1),
  FLUENTIS_COMPANY_CODE: z.string().default('1'),
  FLUENTIS_DEPARTMENT_CODE: z.string().default('1'),
  FLUENTIS_MOCK_MODE: z.string().transform(val => val === 'true').default('false'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;
