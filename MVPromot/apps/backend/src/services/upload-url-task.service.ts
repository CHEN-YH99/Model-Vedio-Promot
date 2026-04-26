import { randomUUID } from 'node:crypto';

import { redis } from '../plugins/redis.js';
import { createUploadUrlTaskStore } from './upload-url-task.store.js';

const uploadUrlTaskStore = createUploadUrlTaskStore({
  createTaskId: () => randomUUID(),
  getNowIso: () => new Date().toISOString(),
  redisGet: (key) => redis.get(key),
  redisSet: (key, value, mode, ttlSeconds) => redis.set(key, value, mode, ttlSeconds),
  ttlSeconds: 24 * 60 * 60,
});

export const createUploadUrlTask = uploadUrlTaskStore.createTask;
export const getUploadUrlTaskForUser = uploadUrlTaskStore.getTaskForUser;
export const markUploadUrlTaskDownloading = uploadUrlTaskStore.markTaskDownloading;
export const markUploadUrlTaskSaving = uploadUrlTaskStore.markTaskSaving;
export const markUploadUrlTaskDone = uploadUrlTaskStore.markTaskDone;
export const markUploadUrlTaskFailed = uploadUrlTaskStore.markTaskFailed;
