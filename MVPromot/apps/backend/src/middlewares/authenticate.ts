import type { FastifyReply, FastifyRequest } from 'fastify';

import { redis } from '../plugins/redis.js';
import { verifyAccessToken } from '../utils/auth-token.js';

function getBearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }

  return header.slice('Bearer '.length).trim();
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const token = getBearerToken(request);

  if (!token) {
    return reply.status(401).send({ message: '未提供访问令牌' });
  }

  try {
    const payload = verifyAccessToken(token);
    const isBlacklisted = await redis.exists(`auth:blacklist:${payload.jti}`);

    if (isBlacklisted > 0) {
      return reply.status(401).send({ message: '访问令牌已失效，请重新登录' });
    }

    request.auth = {
      userId: payload.sub,
      sessionId: payload.sid,
      jti: payload.jti,
      exp: payload.exp,
    };
    return;
  } catch {
    return reply.status(401).send({ message: '访问令牌无效或已过期' });
  }
}
