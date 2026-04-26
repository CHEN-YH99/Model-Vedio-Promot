import { z } from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { getSharedAnalysisResult } from '../services/analysis.service.js';
import { HttpError } from '../utils/http-error.js';

const shareParamsSchema = z.object({
  token: z.string().trim().min(1),
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

export async function sharedAnalysisResultController(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { token } = shareParamsSchema.parse(request.params);
    const result = await getSharedAnalysisResult({ token });

    return reply.send(result);
  } catch (error) {
    const httpError = toHttpError(error);
    return reply.status(httpError.statusCode).send({
      message: httpError.message,
      code: httpError.code,
    });
  }
}
