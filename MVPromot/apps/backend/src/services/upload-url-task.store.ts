import { HttpError } from '../utils/http-error.js';
import type {
  DownloadVideoUrlResult,
  UploadUrlTaskRecord,
  UploadUrlTaskStatus,
} from '../types/upload-url.js';

interface UploadUrlTaskStoreDependencies {
  createTaskId(): string;
  getNowIso(): string;
  redisGet(key: string): Promise<string | null>;
  redisSet(key: string, value: string, mode: 'EX', ttlSeconds: number): Promise<unknown>;
  ttlSeconds: number;
}

const TASK_KEY_PREFIX = 'upload:url:task:';

function toTaskKey(taskId: string) {
  return `${TASK_KEY_PREFIX}${taskId}`;
}

function clampProgress(progress: number) {
  if (!Number.isFinite(progress)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(progress)));
}

function parseTaskRecord(raw: string, taskId: string) {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new HttpError('下载任务状态数据损坏', 500, 'UPLOAD_URL_TASK_STATE_INVALID');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new HttpError('下载任务状态数据损坏', 500, 'UPLOAD_URL_TASK_STATE_INVALID');
  }

  const record = parsed as Partial<UploadUrlTaskRecord>;

  if (!record.taskId || record.taskId !== taskId || !record.userId || !record.status) {
    throw new HttpError('下载任务状态数据损坏', 500, 'UPLOAD_URL_TASK_STATE_INVALID');
  }

  return {
    taskId: record.taskId,
    userId: record.userId,
    status: record.status as UploadUrlTaskStatus,
    progress: clampProgress(record.progress ?? 0),
    errorMessage: record.errorMessage ?? null,
    result: record.result ?? null,
    createdAt: record.createdAt ?? new Date(0).toISOString(),
    updatedAt: record.updatedAt ?? new Date(0).toISOString(),
  } satisfies UploadUrlTaskRecord;
}

export function createUploadUrlTaskStore(dependencies: UploadUrlTaskStoreDependencies) {
  async function saveTask(record: UploadUrlTaskRecord) {
    await dependencies.redisSet(
      toTaskKey(record.taskId),
      JSON.stringify(record),
      'EX',
      dependencies.ttlSeconds,
    );
    return record;
  }

  async function getTaskById(taskId: string) {
    const raw = await dependencies.redisGet(toTaskKey(taskId));
    if (!raw) {
      throw new HttpError('下载任务不存在或已过期', 404, 'UPLOAD_URL_TASK_NOT_FOUND');
    }

    return parseTaskRecord(raw, taskId);
  }

  async function updateTask(
    taskId: string,
    updater: (current: UploadUrlTaskRecord) => UploadUrlTaskRecord,
  ) {
    const current = await getTaskById(taskId);
    const updated = updater(current);
    return saveTask(updated);
  }

  return {
    async createTask(userId: string) {
      const now = dependencies.getNowIso();
      const task = {
        taskId: dependencies.createTaskId(),
        userId,
        status: 'PENDING' as UploadUrlTaskStatus,
        progress: 5,
        errorMessage: null,
        result: null,
        createdAt: now,
        updatedAt: now,
      };

      return saveTask(task);
    },

    async getTaskForUser(input: { taskId: string; userId: string }) {
      const task = await getTaskById(input.taskId);

      if (task.userId !== input.userId) {
        throw new HttpError('无权访问该下载任务', 403, 'UPLOAD_URL_TASK_FORBIDDEN');
      }

      return task;
    },

    async markTaskDownloading(taskId: string, progress = 35) {
      return updateTask(taskId, (current) => ({
        ...current,
        status: 'DOWNLOADING',
        progress: Math.max(current.progress, clampProgress(progress)),
        errorMessage: null,
        updatedAt: dependencies.getNowIso(),
      }));
    },

    async markTaskSaving(taskId: string, progress = 85) {
      return updateTask(taskId, (current) => ({
        ...current,
        status: 'DOWNLOADING',
        progress: Math.max(current.progress, clampProgress(progress)),
        updatedAt: dependencies.getNowIso(),
      }));
    },

    async markTaskDone(taskId: string, result: DownloadVideoUrlResult) {
      return updateTask(taskId, (current) => ({
        ...current,
        status: 'DONE',
        progress: 100,
        errorMessage: null,
        result,
        updatedAt: dependencies.getNowIso(),
      }));
    },

    async markTaskFailed(taskId: string, errorMessage: string) {
      return updateTask(taskId, (current) => ({
        ...current,
        status: 'FAILED',
        progress: Math.max(current.progress, 100),
        errorMessage,
        result: null,
        updatedAt: dependencies.getNowIso(),
      }));
    },
  };
}
