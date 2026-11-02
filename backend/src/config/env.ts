import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

const envCandidates = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), 'backend', '.env'),
  resolve(__dirname, '../../.env'),
];

for (const envPath of envCandidates) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

export const envSchema = z
  .object({
    DATABASE_URL: z.string().url(),
    DIRECT_URL: z.string().url().optional(),
    SESSION_SECRET: z.string().min(16),
    COOKIE_NAME: z.string().default('sim_session'),
    COOKIE_SECURE: z
      .string()
      .default('false')
      .transform((val) => val === 'true'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(4000),
    FRONTEND_URL: z
      .string()
      .url()
      .transform((val) => val.replace(/\/+$/, '')),
    FILE_STORAGE_DRIVER: z.enum(['local', 's3', 'supabase']).default('local'),
    FILE_STORAGE_PATH: z
      .string()
      .default(process.env.VERCEL ? '/tmp/uploads' : './storage/uploads'),
    SUPABASE_URL: z
      .string()
      .url()
      .transform((val) => val.replace(/\/+$/, ''))
      .optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    SUPABASE_STORAGE_BUCKET: z.string().min(1).default('ormawa-files'),
    MAX_UPLOAD_SIZE_MB: z.coerce.number().default(10),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  })
  .superRefine((config, ctx) => {
    if (config.NODE_ENV === 'production' && !config.COOKIE_SECURE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['COOKIE_SECURE'],
        message: 'Cookie Secure wajib aktif pada production',
      });
    }
    if (config.NODE_ENV === 'production' && !config.FRONTEND_URL.startsWith('https://')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['FRONTEND_URL'],
        message: 'Frontend production wajib HTTPS',
      });
    }
    if (config.FILE_STORAGE_DRIVER === 'supabase') {
      if (!config.SUPABASE_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['SUPABASE_URL'],
          message: 'SUPABASE_URL wajib diisi saat FILE_STORAGE_DRIVER=supabase',
        });
      }
      if (!config.SUPABASE_SERVICE_ROLE_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['SUPABASE_SERVICE_ROLE_KEY'],
          message: 'SUPABASE_SERVICE_ROLE_KEY wajib diisi saat FILE_STORAGE_DRIVER=supabase',
        });
      }
    }
  });

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid backend environment variables:', _env.error.format());
  process.exit(1);
}

export const env = _env.data;
