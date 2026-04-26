import { config as dotenv } from 'dotenv';
import { z } from 'zod';

dotenv();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  UPLOAD_DIR: z.string().default('/tmp/uploads'),
  ASSET_CDN_BASE_URL: z.string().url().optional(),
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
  UPLOAD_URL_QUEUE_CONCURRENCY: z.coerce.number().int().positive().default(1),
  ANALYSIS_MAX_FRAMES: z.coerce.number().int().positive().default(50),
  ANALYSIS_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(86400),
  OAUTH_FRONTEND_CALLBACK_URL: z.string().url().default('http://localhost:5173/oauth/callback'),
  OAUTH_GOOGLE_CLIENT_ID: z.string().optional(),
  OAUTH_GOOGLE_CLIENT_SECRET: z.string().optional(),
  OAUTH_GOOGLE_REDIRECT_URI: z.string().url().optional(),
  OAUTH_WECHAT_APP_ID: z.string().optional(),
  OAUTH_WECHAT_APP_SECRET: z.string().optional(),
  OAUTH_WECHAT_REDIRECT_URI: z.string().url().optional(),
  OAUTH_WECHAT_SCOPE: z.enum(['snsapi_base', 'snsapi_userinfo']).default('snsapi_userinfo'),
  SECURITY_ENABLE_HTTPS_REDIRECT: z.coerce.boolean().default(false),
  SECURITY_HTTPS_PORT: z.coerce.number().int().positive().default(443),
  DATA_DELETION_GRACE_DAYS: z.coerce.number().int().positive().default(7),
});

export const env = envSchema.parse(process.env);
