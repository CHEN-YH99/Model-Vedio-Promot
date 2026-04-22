import { Queue, Worker } from 'bullmq';
import type { JobsOptions, Processor } from 'bullmq';

import { env } from '../config/env.js';
import type { AnalysisConfig } from '../types/analysis.js';

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

export interface AnalysisJobData {
  analysisId: string;
  userId: string;
  fileId: string;
  config: AnalysisConfig;
}

export const analysisQueue = new Queue<AnalysisJobData>('analysis', {
  connection: createRedisConnection(),
});

export const ANALYSIS_JOB_OPTIONS: JobsOptions = {
  removeOnComplete: 100,
  removeOnFail: 200,
  attempts: 1,
};

export function createAnalysisWorker(processor: Processor<AnalysisJobData>) {
  return new Worker<AnalysisJobData>('analysis', processor, {
    connection: createRedisConnection(),
    concurrency: env.ANALYSIS_QUEUE_CONCURRENCY,
  });
}
