import { z } from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { normalizePlatforms } from '../services/analysis-prompt.service.js';
import {
  createAnalysisShare,
  deleteAnalysis,
  exportAnalysisResult,
  getAnalysisHistory,
  getAnalysisQuota,
  getAnalysisResult,
  getAnalysisStatus,
  regenerateFramePrompt,
  startAnalysisTask,
  updateFramePrompt,
} from '../services/analysis.service.js';
import { HttpError } from '../utils/http-error.js';
import { sanitizePlainText } from '../utils/sanitize.js';

const promptPlatformSchema = z.enum([
  'sora',
  'runway',
  'kling',
  'pika',
  'wan',
  'hailuo',
  'seedance',
  'happyhorse',
]);
const promptLanguageSchema = z.enum(['zh', 'en', 'bilingual']);

const startBodySchema = z.object({
  fileId: z.string().min(1),
  config: z
    .object({
      sampleDensity: z.enum(['low', 'medium', 'high']).default('medium'),
      platforms: z.array(z.string()).default(['sora', 'runway']),
      language: promptLanguageSchema.default('en'),
    })
    .default({
      sampleDensity: 'medium',
      platforms: ['sora', 'runway'],
      language: 'en',
    }),
});

const analysisParamsSchema = z.object({
  analysisId: z.string().min(1),
});

const analysisFrameParamsSchema = z.object({
  analysisId: z.string().min(1),
  frameId: z.string().min(1),
});

const updateFramePromptBodySchema = z.object({
  platform: promptPlatformSchema,
  language: promptLanguageSchema,
  prompt: z
    .string()
    .transform((value) => sanitizePlainText(value))
    .refine((value) => value.length > 0, '提示词内容不能为空'),
  negativePrompt: z.string().transform((value) => sanitizePlainText(value)).optional(),
});

const analysisExportQuerySchema = z.object({
  format: z.enum(['txt', 'json']).default('json'),
  platform: promptPlatformSchema.optional(),
  language: promptLanguageSchema.optional(),
});

const analysisHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
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
    const { analysisId } = analysisParamsSchema.parse(request.params);
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
    const { analysisId } = analysisParamsSchema.parse(request.params);
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

export async function analysisQuotaController(request: FastifyRequest, reply: FastifyReply) {
  if (!request.auth) {
    return reply.status(401).send({ message: '未登录', code: 'UNAUTHORIZED' });
  }

  try {
    const result = await getAnalysisQuota({
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

export async function analysisHistoryController(request: FastifyRequest, reply: FastifyReply) {
  if (!request.auth) {
    return reply.status(401).send({ message: '未登录', code: 'UNAUTHORIZED' });
  }

  try {
    const query = analysisHistoryQuerySchema.parse(request.query);
    const result = await getAnalysisHistory({
      userId: request.auth.userId,
      page: query.page,
      limit: query.limit,
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

export async function analysisFramePromptUpdateController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.auth) {
    return reply.status(401).send({ message: '未登录', code: 'UNAUTHORIZED' });
  }

  try {
    const { analysisId, frameId } = analysisFrameParamsSchema.parse(request.params);
    const body = updateFramePromptBodySchema.parse(request.body);

    const result = await updateFramePrompt({
      analysisId,
      frameId,
      userId: request.auth.userId,
      platform: body.platform,
      language: body.language,
      prompt: body.prompt,
      negativePrompt: body.negativePrompt,
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

export async function analysisFramePromptRegenerateController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.auth) {
    return reply.status(401).send({ message: '未登录', code: 'UNAUTHORIZED' });
  }

  try {
    const { analysisId, frameId } = analysisFrameParamsSchema.parse(request.params);
    const result = await regenerateFramePrompt({
      analysisId,
      frameId,
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

export async function analysisExportController(request: FastifyRequest, reply: FastifyReply) {
  if (!request.auth) {
    return reply.status(401).send({ message: '未登录', code: 'UNAUTHORIZED' });
  }

  try {
    const { analysisId } = analysisParamsSchema.parse(request.params);
    const query = analysisExportQuerySchema.parse(request.query);

    const result = await exportAnalysisResult({
      analysisId,
      userId: request.auth.userId,
      format: query.format,
      platform: query.platform,
      language: query.language,
    });

    reply.header('Content-Type', result.contentType);
    reply.header('Content-Disposition', `attachment; filename="${result.fileName}"`);

    return reply.send(result.content);
  } catch (error) {
    const httpError = toHttpError(error);
    return reply.status(httpError.statusCode).send({
      message: httpError.message,
      code: httpError.code,
    });
  }
}

export async function analysisShareCreateController(request: FastifyRequest, reply: FastifyReply) {
  if (!request.auth) {
    return reply.status(401).send({ message: '未登录', code: 'UNAUTHORIZED' });
  }

  try {
    const { analysisId } = analysisParamsSchema.parse(request.params);
    const result = await createAnalysisShare({
      analysisId,
      userId: request.auth.userId,
    });

    return reply.status(201).send(result);
  } catch (error) {
    const httpError = toHttpError(error);
    return reply.status(httpError.statusCode).send({
      message: httpError.message,
      code: httpError.code,
    });
  }
}

export async function analysisDeleteController(request: FastifyRequest, reply: FastifyReply) {
  if (!request.auth) {
    return reply.status(401).send({ message: '未登录', code: 'UNAUTHORIZED' });
  }

  try {
    const { analysisId } = analysisParamsSchema.parse(request.params);
    const result = await deleteAnalysis({
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
