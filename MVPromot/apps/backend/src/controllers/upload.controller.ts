import { z } from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { env } from '../config/env.js';
import { downloadVideoByUrl, parseVideoLinkMeta } from '../services/upload-url.service.js';
import { getUploadedVideoMeta, saveUploadedVideo } from '../services/upload.service.js';
import { HttpError } from '../utils/http-error.js';

const paramsSchema = z.object({
  fileId: z.string().min(1),
});

const uploadUrlParseBodySchema = z.object({
  url: z.string().trim().url('视频链接格式不正确'),
});

const uploadUrlDownloadBodySchema = z.object({
  url: z.string().trim().url('视频链接格式不正确'),
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

export async function uploadController(request: FastifyRequest, reply: FastifyReply) {
  if (!request.auth) {
    return reply.status(401).send({
      message: '未登录',
      code: 'UNAUTHORIZED',
    });
  }

  try {
    const part = await request.file();

    if (!part) {
      return reply.status(400).send({
        message: '请上传视频文件',
        code: 'UPLOAD_FILE_REQUIRED',
      });
    }

    const result = await saveUploadedVideo({
      userId: request.auth.userId,
      part,
      uploadDir: env.UPLOAD_DIR,
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

export async function uploadMetaController(request: FastifyRequest, reply: FastifyReply) {
  if (!request.auth) {
    return reply.status(401).send({
      message: '未登录',
      code: 'UNAUTHORIZED',
    });
  }

  try {
    const params = paramsSchema.parse(request.params);
    const meta = await getUploadedVideoMeta({
      fileId: params.fileId,
      userId: request.auth.userId,
    });

    return reply.send(meta);
  } catch (error) {
    const httpError = toHttpError(error);
    return reply.status(httpError.statusCode).send({
      message: httpError.message,
      code: httpError.code,
    });
  }
}

export async function uploadUrlParseController(request: FastifyRequest, reply: FastifyReply) {
  if (!request.auth) {
    return reply.status(401).send({
      message: '未登录',
      code: 'UNAUTHORIZED',
    });
  }

  try {
    const body = uploadUrlParseBodySchema.parse(request.body);
    const result = await parseVideoLinkMeta(body.url);

    return reply.send(result);
  } catch (error) {
    const httpError = toHttpError(error);
    return reply.status(httpError.statusCode).send({
      message: httpError.message,
      code: httpError.code,
    });
  }
}

export async function uploadUrlDownloadController(request: FastifyRequest, reply: FastifyReply) {
  if (!request.auth) {
    return reply.status(401).send({
      message: '未登录',
      code: 'UNAUTHORIZED',
    });
  }

  try {
    const body = uploadUrlDownloadBodySchema.parse(request.body);
    const result = await downloadVideoByUrl({
      userId: request.auth.userId,
      url: body.url,
      uploadDir: env.UPLOAD_DIR,
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
