import { randomUUID } from 'node:crypto';

import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';

import { env } from '../config/env.js';
import type { AccessTokenPayload, RefreshTokenPayload } from '../types/auth.js';

export function createAccessToken(
  userId: string,
  sessionId: string,
): {
  token: string;
  payload: AccessTokenPayload;
} {
  const jti = randomUUID();
  const token = jwt.sign(
    {
      sub: userId,
      sid: sessionId,
      jti,
      type: 'access',
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
    },
  );

  const payload = verifyAccessToken(token);
  return { token, payload };
}

export function createRefreshToken(
  userId: string,
  sessionId: string,
  tokenKey: string,
): {
  token: string;
  payload: RefreshTokenPayload;
} {
  const tokenValue = jwt.sign(
    {
      sub: userId,
      sid: sessionId,
      tkn: tokenKey,
      type: 'refresh',
    },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
    },
  );

  const payload = verifyRefreshToken(tokenValue);
  return { token: tokenValue, payload };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}
