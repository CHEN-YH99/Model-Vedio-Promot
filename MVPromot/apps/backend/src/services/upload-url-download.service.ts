import { env } from '../config/env.js';
import {
  UPLOAD_URL_DOWNLOAD_JOB_OPTIONS,
  uploadUrlDownloadQueue,
} from '../queues/upload-url-download.queue.js';
import { createUploadUrlTask, getUploadUrlTaskForUser } from './upload-url-task.service.js';
import { parseVideoLinkMeta } from './upload-url.service.js';
import { HttpError } from '../utils/http-error.js';

export async function enqueueUrlDownloadTask(input: { userId: string; url: string }) {
  await parseVideoLinkMeta(input.url);

  const task = await createUploadUrlTask(input.userId);

  try {
    await uploadUrlDownloadQueue.add(
      'upload:url:download',
      {
        taskId: task.taskId,
        userId: input.userId,
        url: input.url,
        uploadDir: env.UPLOAD_DIR,
      },
      {
        ...UPLOAD_URL_DOWNLOAD_JOB_OPTIONS,
        jobId: task.taskId,
      },
    );
  } catch {
    throw new HttpError('链接下载任务创建失败，请稍后重试', 500, 'UPLOAD_URL_TASK_CREATE_FAILED');
  }

  return {
    taskId: task.taskId,
    status: task.status,
    progress: task.progress,
    errorMessage: task.errorMessage,
    result: task.result,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

export async function getUrlDownloadTaskStatus(input: { taskId: string; userId: string }) {
  const task = await getUploadUrlTaskForUser(input);

  return {
    taskId: task.taskId,
    status: task.status,
    progress: task.progress,
    errorMessage: task.errorMessage,
    result: task.result,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}
