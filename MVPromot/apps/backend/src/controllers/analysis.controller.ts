import { z } from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { normalizePlatforms } from '../services/analysis-prompt.service.js';
import {
  getAnalysisResult,
  getAnalysisStatus,
  startAnalysisTask,
} from '../services/analysis.service.js';
import { HttpError } from '../utils/http-error.js';

const startBodySchema = z.object({
  fileId: z.string().min(1),
  config: z
    .object({
      sampleDensity: z.enum(['low', 'medium', 'high']).default('medium'),
      platforms: z.array(z.string()).default(['sora', 'runway']),
      language: z.enum(['zh', 'en', 'bilingual']).default('en'),
    })
    .default({
      sampleDensity: 'medium',
      platforms: ['sora', 'runway'],
      language: 'en',
    }),
});

const paramsSchema = z.object({
  analysisId: z.string().min(1),
});

function toHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error;
  }

  if (error instanceof z.ZodError) {
    return new HttpError('请求参数不合法', 400, 'VALIDATION_ERROR');
  }

  return new HttpError('服务器内部错误', 500, 'INTERNAL_ERROR');
}

export async function startAnalysisController(request: FastifyRequest, reply: FastifyReply) {
  if (!request.auth) {
    return reply.status(401).send({ message: '未登录', code: 'UNAUTHORIZED' });
  }

  try {
    const body = startBodySchema.parse(request.body);
    const result = await startAnalysisTask({
      userId: request.auth.userId,
      fileId: body.fileId,
      config: {
        sampleDensity: body.config.sampleDensity,
        platforms: normalizePlatforms(body.config.platforms),
        language: body.config.language,
      },
    });

    return reply.status(202).send(result);
  } catch (error) {
    const httpError = toHttpError(error);
    return reply.status(httpError.statusCode).send({
      message: httpError.message,
      code: httpError.code,
    });
  }
}

export async function analysisStatusController(request: FastifyRequest, reply: FastifyReply) {
  if (!request.auth) {
    return reply.status(401).send({ message: '未登录', code: 'UNAUTHORIZED' });
  }

  try {
    const { analysisId } = paramsSchema.parse(request.params);
    const status = await getAnalysisStatus({
      analysisId,
      userId: request.auth.userId,
    });

    return reply.send(status);
  } catch (error) {
    const httpError = toHttpError(error);
    return reply.status(httpError.statusCode).send({
      message: httpError.message,
      code: httpError.code,
    });
  }
}

export async function analysisResultController(request: FastifyRequest, reply: FastifyReply) {
  if (!request.auth) {
    return reply.status(401).send({ message: '未登录', code: 'UNAUTHORIZED' });
  }

  try {
    const { analysisId } = paramsSchema.parse(request.params);
    const result = await getAnalysisResult({
      analysisId,
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
