import { Redis } from 'ioredis';

import { env } from '../config/env.js';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 1,
});

export async function checkRedisHealth() {
  try {
    const response = await redis.ping();
    return response === 'PONG';
  } catch {
    return false;
  }
}
