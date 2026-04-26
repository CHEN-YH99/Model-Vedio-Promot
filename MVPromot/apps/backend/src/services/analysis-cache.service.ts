import { createHash } from 'node:crypto';

import { env } from '../config/env.js';
import { redis } from '../plugins/redis.js';
import type { AnalysisConfig } from '../types/analysis.js';

function createConfigDigest(config: AnalysisConfig) {
  const normalized = {
    sampleDensity: config.sampleDensity,
    language: config.language,
    platforms: [...config.platforms].sort(),
  };

  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

export function createAnalysisCacheKey(input: {
  userId: string;
  fileId: string;
  config: AnalysisConfig;
}) {
  const digest = createConfigDigest(input.config);
  return `analysis:cache:${input.userId}:${input.fileId}:${digest}`;
}

export async function getCachedAnalysisId(cacheKey: string) {
  const value = await redis.get(cacheKey);
  return value?.trim() || null;
}

export async function setCachedAnalysisId(cacheKey: string, analysisId: string) {
  await redis.set(cacheKey, analysisId, 'EX', env.ANALYSIS_CACHE_TTL_SECONDS);
}
