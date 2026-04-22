import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';

import { env } from './config/env.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerAnalysisRoutes } from './routes/analysis.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerUploadRoutes } from './routes/upload.js';

export async function buildServer() {
  const server = Fastify({
    logger: true,
  });

  await server.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: false,
  });
  await server.register(rateLimit, {
    global: false,
  });
  await server.register(multipart, {
    limits: {
      files: 1,
      fileSize: 500 * 1024 * 1024,
    },
  });
  await server.register(fastifyStatic, {
    root: env.UPLOAD_DIR,
    prefix: '/uploads/',
    decorateReply: false,
  });

  registerAuthRoutes(server);
  registerAnalysisRoutes(server);
  registerUploadRoutes(server);
  registerHealthRoutes(server);

  return server;
}
