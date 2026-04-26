import { mkdir } from 'node:fs/promises';

import { buildServer } from './server.js';
import { env } from './config/env.js';
import { prisma } from './plugins/prisma.js';
import { redis } from './plugins/redis.js';
import { startAnalysisWorker } from './services/analysis-worker.service.js';
import { startUploadCleanupJob } from './services/upload-cleanup.service.js';
import { startUploadUrlDownloadWorker } from './services/upload-url-worker.service.js';

async function bootstrap() {
  await mkdir(env.UPLOAD_DIR, { recursive: true });

  const server = await buildServer();
  let stopCleanupJob = () => {};
  let stopAnalysisWorker: () => Promise<void> = async () => {};
  let stopUploadUrlWorker: () => Promise<void> = async () => {};

  try {
    await server.listen({
      host: '0.0.0.0',
      port: env.PORT,
    });
    stopCleanupJob = startUploadCleanupJob(server.log);
    stopAnalysisWorker = startAnalysisWorker(server.log);
    stopUploadUrlWorker = startUploadUrlDownloadWorker(server.log);
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }

  const shutdown = async () => {
    stopCleanupJob();
    await stopUploadUrlWorker();
    await stopAnalysisWorker();
    await server.close();
    await Promise.allSettled([prisma.$disconnect(), redis.quit()]);
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

void bootstrap();
