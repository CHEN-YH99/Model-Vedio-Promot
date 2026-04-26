import type { FastifyBaseLogger } from 'fastify';

import { processDueDataDeletionRequests } from './data-deletion.service.js';

const POLL_INTERVAL_MS = 60 * 1000;

export function startDataDeletionWorker(logger: FastifyBaseLogger) {
  let running = false;

  const timer = setInterval(async () => {
    if (running) {
      return;
    }

    running = true;

    try {
      const processedCount = await processDueDataDeletionRequests(logger);

      if (processedCount > 0) {
        logger.info({ processedCount }, '已完成到期用户数据删除任务');
      }
    } catch (error) {
      logger.error({ err: error }, '执行用户数据删除轮询任务失败');
    } finally {
      running = false;
    }
  }, POLL_INTERVAL_MS);

  timer.unref();

  return () => {
    clearInterval(timer);
  };
}
