import { rm } from 'node:fs/promises';

import type { FastifyBaseLogger } from 'fastify';

import { prisma } from '../plugins/prisma.js';

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
const RETENTION_MS = 24 * 60 * 60 * 1000;

async function cleanupExpiredUploads(logger: FastifyBaseLogger) {
  const deadline = new Date(Date.now() - RETENTION_MS);

  const files = await prisma.uploadedFile.findMany({
    where: {
      uploadedAt: {
        lt: deadline,
      },
    },
    select: {
      id: true,
      path: true,
    },
  });

  if (files.length === 0) {
    return;
  }

  for (const file of files) {
    try {
      await rm(file.path, { force: true });
    } catch (error) {
      logger.warn(
        { err: error, filePath: file.path },
        '删除过期上传文件失败，将继续删除数据库记录',
      );
    }
  }

  await prisma.uploadedFile.deleteMany({
    where: {
      id: {
        in: files.map((file) => file.id),
      },
    },
  });

  logger.info({ count: files.length }, '过期上传文件清理完成');
}

export function startUploadCleanupJob(logger: FastifyBaseLogger) {
  const timer = setInterval(() => {
    void cleanupExpiredUploads(logger).catch((error) => {
      logger.error({ err: error }, '过期上传文件清理任务执行失败');
    });
  }, CLEANUP_INTERVAL_MS);

  timer.unref();

  return () => {
    clearInterval(timer);
  };
}
