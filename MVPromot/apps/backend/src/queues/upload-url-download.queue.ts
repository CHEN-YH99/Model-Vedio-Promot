import { Queue, Worker } from 'bullmq';
import type { JobsOptions, Processor } from 'bullmq';

import { env } from '../config/env.js';

function createRedisConnection() {
  const redisUrl = new URL(env.REDIS_URL);
  const db = Number(redisUrl.pathname.replace('/', '') || '0');

  return {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    username: redisUrl.username || undefined,
    password: redisUrl.password || undefined,
    db,
  };
}

export interface UploadUrlDownloadJobData {
  taskId: string;
  userId: string;
  url: string;
  uploadDir: string;
}

export const uploadUrlDownloadQueue = new Queue<UploadUrlDownloadJobData>('upload-url-download', {
  connection: createRedisConnection(),
});

export const UPLOAD_URL_DOWNLOAD_JOB_OPTIONS: JobsOptions = {
  removeOnComplete: 100,
  removeOnFail: 200,
  attempts: 1,
};

export function createUploadUrlDownloadWorker(processor: Processor<UploadUrlDownloadJobData>) {
  return new Worker<UploadUrlDownloadJobData>('upload-url-download', processor, {
    connection: createRedisConnection(),
    concurrency: env.UPLOAD_URL_QUEUE_CONCURRENCY,
  });
}
