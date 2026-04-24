import { config as dotenv } from 'dotenv';
import { z } from 'zod';

dotenv();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  UPLOAD_DIR: z.string().default('/tmp/uploads'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  ANALYSIS_PROVIDER: z.enum(['mock', 'openai']).default('mock'),
  OPENAI_BASE_URL: z.string().url().default('https://open.bigmodel.cn/api/paas/v4'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('glm-4.1v-thinking-flashx'),
  OPENAI_API_STYLE: z.enum(['auto', 'chat']).default('chat'),
  ANALYSIS_QUEUE_CONCURRENCY: z.coerce.number().int().positive().default(1),
  ANALYSIS_MAX_FRAMES: z.coerce.number().int().positive().default(50),
});

export const env = envSchema.parse(process.env);
