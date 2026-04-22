import { z } from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { redis } from '../plugins/redis.js';
import {
  getCurrentUser,
  isPrismaKnownRequestError,
  loginWithEmail,
  markAccessTokenAsBlacklisted,
  refreshSession,
  registerWithEmail,
  revokeSession,
} from '../services/auth.service.js';
import { HttpError } from '../utils/http-error.js';

const registerBodySchema = z.object({
  email: z
    .string()
    .email('邮箱格式不正确')
    .transform((value) => value.trim().toLowerCase()),
  password: z
    .string()
    .min(8, '密码至少 8 位')
    .regex(/[A-Z]/, '密码至少包含 1 个大写字母')
    .regex(/[a-z]/, '密码至少包含 1 个小写字母')
    .regex(/\d/, '密码至少包含 1 个数字'),
  name: z.string().trim().min(1).max(30).optional(),
});

const loginBodySchema = z.object({
  email: z
    .string()
    .email('邮箱格式不正确')
    .transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1, '密码不能为空'),
});

const refreshBodySchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken 不能为空'),
});

const logoutBodySchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

function getValidationMessage(error: z.ZodError) {
  const issue = error.issues[0];
  return issue?.message ?? '请求参数不合法';
}

function toHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error;
  }

  if (error instanceof z.ZodError) {
    return new HttpError(getValidationMessage(error), 400, 'VALIDATION_ERROR');
  }

  if (isPrismaKnownRequestError(error) && error.code === 'P2002') {
    return new HttpError('邮箱已注册', 409, 'EMAIL_EXISTS');
  }

  return new HttpError('服务器内部错误', 500, 'INTERNAL_ERROR');
}

export async function registerController(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = registerBodySchema.parse(request.body);
    const result = await registerWithEmail(body);
    return reply.status(201).send(result);
  } catch (error) {
    const httpError = toHttpError(error);
    return reply.status(httpError.statusCode).send({
      message: httpError.message,
      code: httpError.code,
    });
  }
}

export async function loginController(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = loginBodySchema.parse(request.body);
    const result = await loginWithEmail(body);
    return reply.send(result);
  } catch (error) {
    const httpError = toHttpError(error);
    return reply.status(httpError.statusCode).send({
      message: httpError.message,
      code: httpError.code,
    });
  }
}

export async function meController(request: FastifyRequest, reply: FastifyReply) {
  if (!request.auth) {
    return reply.status(401).send({
      message: '未登录',
      code: 'UNAUTHORIZED',
    });
  }

  try {
    const user = await getCurrentUser(request.auth.userId);
    return reply.send({ user });
  } catch (error) {
    const httpError = toHttpError(error);
    return reply.status(httpError.statusCode).send({
      message: httpError.message,
      code: httpError.code,
    });
  }
}

export async function refreshController(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = refreshBodySchema.parse(request.body);
    const tokens = await refreshSession(body.refreshToken);
    return reply.send(tokens);
  } catch (error) {
    const httpError = toHttpError(error);
    return reply.status(httpError.statusCode).send({
      message: httpError.message,
      code: httpError.code,
    });
  }
}

export async function logoutController(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = logoutBodySchema.parse(request.body ?? {});

    if (request.auth) {
      await markAccessTokenAsBlacklisted({
        jti: request.auth.jti,
        exp: request.auth.exp,
        redisSet: redis.set.bind(redis),
      });
    }

    if (body.refreshToken) {
      await revokeSession(body.refreshToken);
    }

    return reply.send({ success: true });
  } catch (error) {
    const httpError = toHttpError(error);
    return reply.status(httpError.statusCode).send({
      message: httpError.message,
      code: httpError.code,
    });
  }
}
