import { z } from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';

import {
  cancelPendingDataDeletionRequest,
  createDataDeletionRequest,
  getLatestDataDeletionRequest,
} from '../services/data-deletion.service.js';
import { HttpError } from '../utils/http-error.js';
import { sanitizePlainText } from '../utils/sanitize.js';

const createDeletionBodySchema = z.object({
  reason: z.string().max(500).transform((value) => sanitizePlainText(value)).optional(),
});

function toHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error;
  }

  if (error instanceof z.ZodError) {
    const issue = error.issues[0];
    return new HttpError(issue?.message ?? '请求参数不合法', 400, 'VALIDATION_ERROR');
  }

  return new HttpError('服务器内部错误', 500, 'INTERNAL_ERROR');
}

export async function accountDeletionRequestCreateController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.auth) {
    return reply.status(401).send({
      message: '未登录',
      code: 'UNAUTHORIZED',
    });
  }

  try {
    const body = createDeletionBodySchema.parse(request.body ?? {});
    const result = await createDataDeletionRequest({
      userId: request.auth.userId,
      reason: body.reason,
    });

    return reply.status(result.alreadyPending ? 200 : 201).send(result);
  } catch (error) {
    const httpError = toHttpError(error);
    return reply.status(httpError.statusCode).send({
      message: httpError.message,
      code: httpError.code,
    });
  }
}

export async function accountDeletionRequestGetController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.auth) {
    return reply.status(401).send({
      message: '未登录',
      code: 'UNAUTHORIZED',
    });
  }

  try {
    const result = await getLatestDataDeletionRequest({
      userId: request.auth.userId,
    });

    return reply.send({
      request: result,
    });
  } catch (error) {
    const httpError = toHttpError(error);
    return reply.status(httpError.statusCode).send({
      message: httpError.message,
      code: httpError.code,
    });
  }
}

export async function accountDeletionRequestCancelController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.auth) {
    return reply.status(401).send({
      message: '未登录',
      code: 'UNAUTHORIZED',
    });
  }

  try {
    const result = await cancelPendingDataDeletionRequest({
      userId: request.auth.userId,
    });

    return reply.send(result);
  } catch (error) {
    const httpError = toHttpError(error);
    return reply.status(httpError.statusCode).send({
      message: httpError.message,
      code: httpError.code,
    });
  }
}
