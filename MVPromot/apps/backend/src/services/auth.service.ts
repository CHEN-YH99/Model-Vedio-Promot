import { randomUUID } from 'node:crypto';

import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

import { env } from '../config/env.js';
import { prisma } from '../plugins/prisma.js';
import { durationToMs } from '../utils/duration.js';
import { HttpError } from '../utils/http-error.js';
import { createAccessToken, createRefreshToken, verifyRefreshToken } from '../utils/auth-token.js';
import type {
  AuthSuccessResponse,
  OAuthProviderName,
  RefreshTokenPayload,
  TokenPair,
} from '../types/auth.js';

type AuthPlan = AuthSuccessResponse['user']['plan'];
type OAuthProviderRecord = 'GOOGLE' | 'WECHAT';

interface AuthUserRecord {
  id: string;
  email: string;
  name: string | null;
  plan: AuthPlan;
  createdAt: Date;
  passwordHash: string;
}

interface AuthSessionRecord {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
}

interface AuthOAuthAccountRecord {
  id: string;
  provider: OAuthProviderRecord;
  providerAccountId: string;
  userId: string;
  user?: AuthUserRecord;
}

interface AuthPrismaClient {
  user: {
    findUnique(args: { where: { email?: string; id?: string } }): Promise<AuthUserRecord | null>;
    create(args: {
      data: {
        email: string;
        name?: string;
        passwordHash: string;
      };
    }): Promise<AuthUserRecord>;
  };
  session: {
    create(args: {
      data: {
        userId: string;
        token: string;
        expiresAt: Date;
      };
    }): Promise<AuthSessionRecord>;
    update(args: {
      where: { id: string };
      data: {
        token?: string;
        expiresAt?: Date;
      };
    }): Promise<AuthSessionRecord>;
    findUnique(args: { where: { id: string } }): Promise<AuthSessionRecord | null>;
    deleteMany(args: { where: { id?: string; token?: string; userId?: string } }): Promise<unknown>;
  };
  oauthAccount?: {
    findUnique(args: {
      where: {
        provider_providerAccountId: {
          provider: OAuthProviderRecord;
          providerAccountId: string;
        };
      };
      include?: {
        user?: boolean;
      };
    }): Promise<AuthOAuthAccountRecord | null>;
    create(args: {
      data: {
        provider: OAuthProviderRecord;
        providerAccountId: string;
        userId: string;
      };
    }): Promise<AuthOAuthAccountRecord>;
  };
}

interface AuthServiceDependencies {
  prisma: AuthPrismaClient;
  hashPassword(password: string, rounds: number): Promise<string>;
  comparePassword(password: string, passwordHash: string): Promise<boolean>;
  createAccessToken(userId: string, sessionId: string): {
    token: string;
  };
  createRefreshToken(userId: string, sessionId: string, tokenKey: string): {
    token: string;
    payload: RefreshTokenPayload;
  };
  verifyRefreshToken(token: string): RefreshTokenPayload;
  createRandomTokenKey(): string;
  getNow(): number;
  refreshTokenTtlMs: number;
  saltRounds: number;
}

function toAuthUser(user: Pick<AuthUserRecord, 'id' | 'email' | 'name' | 'plan' | 'createdAt'>) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
    createdAt: user.createdAt.toISOString(),
  };
}

function toOAuthProviderRecord(provider: OAuthProviderName): OAuthProviderRecord {
  if (provider === 'google') {
    return 'GOOGLE';
  }

  return 'WECHAT';
}

function normalizeEmail(email: string | null | undefined) {
  if (!email) {
    return null;
  }

  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function sanitizeProviderAccountId(providerAccountId: string) {
  const value = providerAccountId.trim();

  if (!value) {
    throw new HttpError('第三方账号标识为空', 400, 'OAUTH_ACCOUNT_INVALID');
  }

  return value;
}

function createOAuthFallbackEmail(provider: OAuthProviderName, providerAccountId: string) {
  return `${provider}_${providerAccountId}@oauth.local`;
}

function createOAuthFallbackName(provider: OAuthProviderName) {
  return provider === 'google' ? 'Google 用户' : '微信用户';
}

export function createAuthService(dependencies: AuthServiceDependencies) {
  async function issueTokenPair(userId: string): Promise<TokenPair> {
    const now = dependencies.getNow();
    const tokenKey = dependencies.createRandomTokenKey();

    const session = await dependencies.prisma.session.create({
      data: {
        userId,
        token: tokenKey,
        expiresAt: new Date(now + dependencies.refreshTokenTtlMs),
      },
    });

    const { token: accessToken } = dependencies.createAccessToken(userId, session.id);
    const {
      token: refreshToken,
      payload,
    } = dependencies.createRefreshToken(userId, session.id, tokenKey);

    await dependencies.prisma.session.update({
      where: {
        id: session.id,
      },
      data: {
        expiresAt: new Date(payload.exp * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async function registerWithEmail(input: {
    email: string;
    password: string;
    name?: string;
  }): Promise<AuthSuccessResponse> {
    const exists = await dependencies.prisma.user.findUnique({
      where: {
        email: input.email,
      },
    });

    if (exists) {
      throw new HttpError('邮箱已注册', 409, 'EMAIL_EXISTS');
    }

    const passwordHash = await dependencies.hashPassword(input.password, dependencies.saltRounds);

    const user = await dependencies.prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
      },
    });

    const tokens = await issueTokenPair(user.id);

    return {
      user: toAuthUser(user),
      ...tokens,
    };
  }

  async function loginWithEmail(input: {
    email: string;
    password: string;
  }): Promise<AuthSuccessResponse> {
    const user = await dependencies.prisma.user.findUnique({
      where: {
        email: input.email,
      },
    });

    if (!user) {
      throw new HttpError('邮箱或密码错误', 401, 'INVALID_CREDENTIALS');
    }

    const matched = await dependencies.comparePassword(input.password, user.passwordHash);

    if (!matched) {
      throw new HttpError('邮箱或密码错误', 401, 'INVALID_CREDENTIALS');
    }

    const tokens = await issueTokenPair(user.id);

    return {
      user: toAuthUser(user),
      ...tokens,
    };
  }

  async function loginWithOAuth(input: {
    provider: OAuthProviderName;
    providerAccountId: string;
    email?: string | null;
    name?: string | null;
  }): Promise<AuthSuccessResponse> {
    const oauthAccount = dependencies.prisma.oauthAccount;

    if (!oauthAccount) {
      throw new HttpError('服务端未启用第三方登录', 500, 'OAUTH_NOT_ENABLED');
    }

    const provider = toOAuthProviderRecord(input.provider);
    const providerAccountId = sanitizeProviderAccountId(input.providerAccountId);

    const exists = await oauthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
      include: {
        user: true,
      },
    });

    if (exists?.user) {
      const tokens = await issueTokenPair(exists.user.id);

      return {
        user: toAuthUser(exists.user),
        ...tokens,
      };
    }

    const normalizedEmail = normalizeEmail(input.email);
    let user = normalizedEmail
      ? await dependencies.prisma.user.findUnique({
          where: {
            email: normalizedEmail,
          },
        })
      : null;

    if (!user) {
      const fallbackEmail = createOAuthFallbackEmail(input.provider, providerAccountId);
      const passwordHash = await dependencies.hashPassword(
        `${dependencies.createRandomTokenKey()}:${providerAccountId}`,
        dependencies.saltRounds,
      );

      try {
        user = await dependencies.prisma.user.create({
          data: {
            email: normalizedEmail ?? fallbackEmail,
            name: input.name?.trim() || createOAuthFallbackName(input.provider),
            passwordHash,
          },
        });
      } catch (error) {
        if (isPrismaKnownRequestError(error) && error.code === 'P2002' && normalizedEmail) {
          user = await dependencies.prisma.user.findUnique({
            where: {
              email: normalizedEmail,
            },
          });
        }

        if (!user) {
          throw error;
        }
      }
    }

    try {
      await oauthAccount.create({
        data: {
          provider,
          providerAccountId,
          userId: user.id,
        },
      });
    } catch (error) {
      if (!(isPrismaKnownRequestError(error) && error.code === 'P2002')) {
        throw error;
      }
    }

    const linked = await oauthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
      include: {
        user: true,
      },
    });

    const targetUser = linked?.user ?? user;
    const tokens = await issueTokenPair(targetUser.id);

    return {
      user: toAuthUser(targetUser),
      ...tokens,
    };
  }

  async function getCurrentUser(userId: string) {
    const user = await dependencies.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new HttpError('用户不存在', 404, 'USER_NOT_FOUND');
    }

    return toAuthUser(user);
  }

  async function refreshSession(refreshToken: string): Promise<TokenPair> {
    let payload: RefreshTokenPayload;

    try {
      payload = dependencies.verifyRefreshToken(refreshToken);
    } catch {
      throw new HttpError('刷新令牌无效或已过期', 401, 'INVALID_REFRESH_TOKEN');
    }

    if (payload.type !== 'refresh') {
      throw new HttpError('刷新令牌类型错误', 401, 'INVALID_REFRESH_TOKEN');
    }

    const session = await dependencies.prisma.session.findUnique({
      where: {
        id: payload.sid,
      },
    });

    if (
      !session ||
      session.token !== payload.tkn ||
      session.expiresAt.getTime() <= dependencies.getNow()
    ) {
      throw new HttpError('刷新令牌已失效', 401, 'INVALID_REFRESH_TOKEN');
    }

    const nextTokenKey = dependencies.createRandomTokenKey();
    const { token: accessToken } = dependencies.createAccessToken(payload.sub, payload.sid);
    const {
      token: nextRefreshToken,
      payload: nextPayload,
    } = dependencies.createRefreshToken(payload.sub, payload.sid, nextTokenKey);

    await dependencies.prisma.session.update({
      where: {
        id: session.id,
      },
      data: {
        token: nextTokenKey,
        expiresAt: new Date(nextPayload.exp * 1000),
      },
    });

    return {
      accessToken,
      refreshToken: nextRefreshToken,
    };
  }

  async function revokeSession(refreshToken: string) {
    let payload: RefreshTokenPayload;

    try {
      payload = dependencies.verifyRefreshToken(refreshToken);
    } catch {
      return;
    }

    if (payload.type !== 'refresh') {
      return;
    }

    await dependencies.prisma.session.deleteMany({
      where: {
        id: payload.sid,
        token: payload.tkn,
      },
    });
  }

  async function revokeUserSessions(userId: string) {
    await dependencies.prisma.session.deleteMany({
      where: {
        userId,
      },
    });
  }

  return {
    registerWithEmail,
    loginWithEmail,
    loginWithOAuth,
    getCurrentUser,
    refreshSession,
    revokeSession,
    revokeUserSessions,
  };
}

const authService = createAuthService({
  prisma: prisma as unknown as AuthPrismaClient,
  hashPassword: (password, rounds) => bcrypt.hash(password, rounds),
  comparePassword: (password, passwordHash) => bcrypt.compare(password, passwordHash),
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
  createRandomTokenKey: () => randomUUID(),
  getNow: () => Date.now(),
  refreshTokenTtlMs: durationToMs(env.JWT_REFRESH_EXPIRES_IN),
  saltRounds: 10,
});

export const registerWithEmail = authService.registerWithEmail;
export const loginWithEmail = authService.loginWithEmail;
export const loginWithOAuth = authService.loginWithOAuth;
export const getCurrentUser = authService.getCurrentUser;
export const refreshSession = authService.refreshSession;
export const revokeSession = authService.revokeSession;
export const revokeUserSessions = authService.revokeUserSessions;

export async function markAccessTokenAsBlacklisted(input: {
  jti: string;
  exp: number;
  redisSet: (key: string, value: string, mode: 'EX', ttl: number) => Promise<unknown>;
}) {
  const ttl = input.exp - Math.floor(Date.now() / 1000);

  if (ttl <= 0) {
    return;
  }

  await input.redisSet(`auth:blacklist:${input.jti}`, '1', 'EX', ttl);
}

export function isPrismaKnownRequestError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}
