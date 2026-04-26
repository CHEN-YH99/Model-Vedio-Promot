import type { FastifyReply, FastifyRequest } from 'fastify';

import { assertAnalysisQuotaAvailable } from '../services/quota.service.js';
import { HttpError } from '../utils/http-error.js';

export async function enforceAnalysisQuota(request: FastifyRequest, reply: FastifyReply) {
  if (!request.auth) {
    return reply.status(401).send({ message: '未登录', code: 'UNAUTHORIZED' });
  }

  try {
    await assertAnalysisQuotaAvailable({ userId: request.auth.userId });
  } catch (error) {
    if (error instanceof HttpError) {
      return reply.status(error.statusCode).send({
        message: error.message,
        code: error.code,
      });
    }

    return reply.status(500).send({
      message: '配额检查失败',
      code: 'QUOTA_CHECK_FAILED',
    });
  }

  return;
}
