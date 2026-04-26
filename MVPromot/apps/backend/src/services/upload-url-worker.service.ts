import type { FastifyBaseLogger } from 'fastify';
import type { Processor } from 'bullmq';

import { createUploadUrlDownloadWorker } from '../queues/upload-url-download.queue.js';
import { HttpError } from '../utils/http-error.js';
import { downloadVideoByUrl } from './upload-url.service.js';
import {
  markUploadUrlTaskDone,
  markUploadUrlTaskDownloading,
  markUploadUrlTaskFailed,
  markUploadUrlTaskSaving,
} from './upload-url-task.service.js';

export function startUploadUrlDownloadWorker(logger: FastifyBaseLogger) {
  const processor: Processor = async (job) => {
    const { taskId, userId, url, uploadDir } = job.data;

    try {
      await markUploadUrlTaskDownloading(taskId, 35);
      const result = await downloadVideoByUrl({
        userId,
        url,
        uploadDir,
      });
      await markUploadUrlTaskSaving(taskId, 88);
      await markUploadUrlTaskDone(taskId, result);
      logger.info({ taskId }, '链接下载任务完成');
    } catch (error) {
      const message = error instanceof HttpError ? error.message : '链接下载任务执行失败';

      await markUploadUrlTaskFailed(taskId, message).catch(() => {
        logger.error({ taskId }, '写入下载失败状态时发生错误');
      });

      logger.error({ err: error, taskId }, '链接下载任务失败');
      throw error;
    }
  };

  const worker = createUploadUrlDownloadWorker(processor);

  worker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, err: error }, '链接下载队列 worker 处理失败');
  });

  worker.on('error', (error) => {
    logger.error({ err: error }, '链接下载队列 worker 异常');
  });

  return async () => {
    await worker.close();
  };
}
