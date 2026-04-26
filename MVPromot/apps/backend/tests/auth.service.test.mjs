import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-12345678901234567890';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-1234567890123456789';

const { createAuthService, markAccessTokenAsBlacklisted } = await import(
  '../dist/services/auth.service.js'
);
const { HttpError } = await import('../dist/utils/http-error.js');

function createUser(overrides = {}) {
  return {
    id: overrides.id ?? 'user_1',
    email: overrides.email ?? 'user@example.com',
    name: overrides.name ?? '测试用户',
    plan: overrides.plan ?? 'FREE',
    createdAt: overrides.createdAt ?? new Date('2026-04-13T00:00:00.000Z'),
    passwordHash: overrides.passwordHash ?? 'hash:Secret123',
  };
}

function createTestContext(options = {}) {
  const users = [...(options.users ?? [])];
  const sessions = [];
  const oauthAccounts = [];
  const tokenStore = new Map();

  let userCounter = users.length;
  let sessionCounter = 0;
  let oauthCounter = 0;
  let tokenCounter = 0;

  const prisma = {
    user: {
      async findUnique(args) {
        const { email, id } = args.where;
        return users.find((user) => user.email === email || user.id === id) ?? null;
      },
      async create(args) {
        userCounter += 1;
        const user = createUser({
          id: `user_${userCounter}`,
          email: args.data.email,
          name: args.data.name ?? null,
          passwordHash: args.data.passwordHash,
        });
        users.push(user);
        return user;
      },
    },
    session: {
      async create(args) {
        sessionCounter += 1;
        const session = {
          id: `session_${sessionCounter}`,
          ...args.data,
        };
        sessions.push(session);
        return session;
      },
      async update(args) {
        const session = sessions.find((item) => item.id === args.where.id);
        assert.ok(session, 'expected session to exist');

        if (args.data.token !== undefined) {
          session.token = args.data.token;
        }

        if (args.data.expiresAt !== undefined) {
          session.expiresAt = args.data.expiresAt;
        }

        return session;
      },
      async findUnique(args) {
        return sessions.find((session) => session.id === args.where.id) ?? null;
      },
      async deleteMany(args) {
        const before = sessions.length;

        for (let index = sessions.length - 1; index >= 0; index -= 1) {
          const session = sessions[index];
          if (!session) {
            continue;
          }

          const matchId = args.where.id === undefined || session.id === args.where.id;
          const matchToken = args.where.token === undefined || session.token === args.where.token;

          if (matchId && matchToken) {
            sessions.splice(index, 1);
          }
        }

        return {
          count: before - sessions.length,
        };
      },
    },
    oauthAccount: {
      async findUnique(args) {
        const target = oauthAccounts.find((item) => {
          return (
            item.provider === args.where.provider_providerAccountId.provider &&
            item.providerAccountId === args.where.provider_providerAccountId.providerAccountId
          );
        });

        if (!target) {
          return null;
        }

        if (!args.include?.user) {
          return target;
        }

        return {
          ...target,
          user: users.find((item) => item.id === target.userId) ?? null,
        };
      },
      async create(args) {
        oauthCounter += 1;
        const exists = oauthAccounts.find((item) => {
          return (
            item.provider === args.data.provider &&
            item.providerAccountId === args.data.providerAccountId
          );
        });

        if (exists) {
          return exists;
        }

        const record = {
          id: `oauth_${oauthCounter}`,
          provider: args.data.provider,
          providerAccountId: args.data.providerAccountId,
          userId: args.data.userId,
        };
        oauthAccounts.push(record);
        return record;
      },
    },
  };

  const service = createAuthService({
    prisma,
    hashPassword: async (password) => `hash:${password}`,
    comparePassword:
      options.comparePassword ??
      (async (password, passwordHash) => {
        return passwordHash === `hash:${password}`;
      }),
    createAccessToken: (userId, sessionId) => ({
      token: `access:${userId}:${sessionId}`,
    }),
    createRefreshToken: (userId, sessionId, tokenKey) => {
      tokenCounter += 1;
      const payload = {
        sub: userId,
        sid: sessionId,
        tkn: tokenKey,
        type: 'refresh',
        iat: 1_000 + tokenCounter,
        exp: 2_000 + tokenCounter * 1_000,
      };
      const token = `refresh:${tokenKey}`;
      tokenStore.set(token, payload);

      return {
        token,
        payload,
      };
    },
    verifyRefreshToken:
      options.verifyRefreshToken ??
      ((token) => {
        const payload = tokenStore.get(token);
        if (!payload) {
          throw new Error('invalid-refresh-token');
        }

        return payload;
      }),
    createRandomTokenKey: () => `token-key-${tokenCounter + 1}`,
    getNow: () => 1_000_000,
    refreshTokenTtlMs: 7 * 24 * 60 * 60 * 1000,
    saltRounds: 10,
  });

  return {
    service,
    users,
    sessions,
    oauthAccounts,
  };
}

test('registerWithEmail 会创建用户、哈希密码并签发 token', async () => {
  const context = createTestContext();

  const result = await context.service.registerWithEmail({
    email: 'new@example.com',
    password: 'Secret123',
    name: '新用户',
  });

  assert.equal(result.user.email, 'new@example.com');
  assert.equal(result.user.name, '新用户');
  assert.equal(result.accessToken, 'access:user_1:session_1');
  assert.equal(result.refreshToken, 'refresh:token-key-1');
  assert.equal(context.users[0]?.passwordHash, 'hash:Secret123');
  assert.equal(context.sessions[0]?.token, 'token-key-1');
  assert.equal(
    context.sessions[0]?.expiresAt.toISOString(),
    new Date(3_000 * 1000).toISOString(),
  );
});

test('registerWithEmail 遇到重复邮箱会抛出业务错误', async () => {
  const context = createTestContext({
    users: [createUser({ email: 'exists@example.com' })],
  });

  await assert.rejects(
    async () => {
      await context.service.registerWithEmail({
        email: 'exists@example.com',
        password: 'Secret123',
      });
    },
    (error) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 409);
      assert.equal(error.code, 'EMAIL_EXISTS');
      return true;
    },
  );
});

test('loginWithEmail 成功时返回当前用户和 token', async () => {
  const context = createTestContext({
    users: [createUser()],
  });

  const result = await context.service.loginWithEmail({
    email: 'user@example.com',
    password: 'Secret123',
  });

  assert.equal(result.user.id, 'user_1');
  assert.equal(result.accessToken, 'access:user_1:session_1');
  assert.equal(result.refreshToken, 'refresh:token-key-1');
});

test('loginWithEmail 在密码错误时返回 401', async () => {
  const context = createTestContext({
    users: [createUser()],
    comparePassword: async () => false,
  });

  await assert.rejects(
    async () => {
      await context.service.loginWithEmail({
        email: 'user@example.com',
        password: 'wrong-password',
      });
    },
    (error) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 401);
      assert.equal(error.code, 'INVALID_CREDENTIALS');
      return true;
    },
  );
});

test('getCurrentUser 会返回当前用户资料，缺失时抛出 404', async () => {
  const context = createTestContext({
    users: [createUser()],
  });

  const user = await context.service.getCurrentUser('user_1');
  assert.equal(user.email, 'user@example.com');

  await assert.rejects(
    async () => {
      await context.service.getCurrentUser('missing-user');
    },
    (error) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 404);
      assert.equal(error.code, 'USER_NOT_FOUND');
      return true;
    },
  );
});

test('refreshSession 会校验旧会话并轮换 refresh token', async () => {
  const context = createTestContext({
    users: [createUser()],
  });

  const firstLogin = await context.service.loginWithEmail({
    email: 'user@example.com',
    password: 'Secret123',
  });

  const refreshed = await context.service.refreshSession(firstLogin.refreshToken);

  assert.equal(refreshed.accessToken, 'access:user_1:session_1');
  assert.equal(refreshed.refreshToken, 'refresh:token-key-2');
  assert.equal(context.sessions[0]?.token, 'token-key-2');
  assert.equal(
    context.sessions[0]?.expiresAt.toISOString(),
    new Date(4_000 * 1000).toISOString(),
  );
});

test('refreshSession 在 refresh token 非法时返回 401', async () => {
  const context = createTestContext();

  await assert.rejects(
    async () => {
      await context.service.refreshSession('refresh:missing');
    },
    (error) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 401);
      assert.equal(error.code, 'INVALID_REFRESH_TOKEN');
      return true;
    },
  );
});

test('revokeSession 只删除匹配的会话，非法 token 会直接忽略', async () => {
  const context = createTestContext({
    users: [createUser()],
  });

  const firstLogin = await context.service.loginWithEmail({
    email: 'user@example.com',
    password: 'Secret123',
  });

  assert.equal(context.sessions.length, 1);
  await context.service.revokeSession(firstLogin.refreshToken);
  assert.equal(context.sessions.length, 0);

  await context.service.revokeSession('refresh:missing');
  assert.equal(context.sessions.length, 0);
});

test('markAccessTokenAsBlacklisted 会按剩余过期时间写入 redis', async () => {
  const calls = [];
  const now = Date.now();
  const futureExp = Math.floor(now / 1000) + 120;

  await markAccessTokenAsBlacklisted({
    jti: 'token-1',
    exp: futureExp,
    redisSet: async (...args) => {
      calls.push(args);
      return 'OK';
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.[0], 'auth:blacklist:token-1');
  assert.equal(calls[0]?.[1], '1');
  assert.equal(calls[0]?.[2], 'EX');
  assert.ok((calls[0]?.[3] ?? 0) > 0);

  await markAccessTokenAsBlacklisted({
    jti: 'token-2',
    exp: Math.floor(now / 1000) - 1,
    redisSet: async (...args) => {
      calls.push(args);
      return 'OK';
    },
  });

  assert.equal(calls.length, 1);
});

test('loginWithOAuth 首次登录会创建用户并绑定 OAuth 账号', async () => {
  const context = createTestContext();

  const result = await context.service.loginWithOAuth({
    provider: 'google',
    providerAccountId: 'google-sub-1',
    email: 'oauth-new@example.com',
    name: 'OAuth User',
  });

  assert.equal(result.user.email, 'oauth-new@example.com');
  assert.equal(context.users.length, 1);
  assert.equal(context.oauthAccounts.length, 1);
  assert.equal(context.oauthAccounts[0]?.provider, 'GOOGLE');
});

test('loginWithOAuth 会将同邮箱 OAuth 账号并入已存在用户', async () => {
  const context = createTestContext({
    users: [createUser({ id: 'user_existing', email: 'merge@example.com' })],
  });

  const result = await context.service.loginWithOAuth({
    provider: 'google',
    providerAccountId: 'google-sub-merge',
    email: 'merge@example.com',
    name: 'Merge User',
  });

  assert.equal(result.user.id, 'user_existing');
  assert.equal(context.users.length, 1);
  assert.equal(context.oauthAccounts.length, 1);
  assert.equal(context.oauthAccounts[0]?.userId, 'user_existing');
});

test('loginWithOAuth 二次登录同一 providerAccountId 时应复用现有绑定', async () => {
  const context = createTestContext();

  await context.service.loginWithOAuth({
    provider: 'wechat',
    providerAccountId: 'wechat-openid-1',
    email: null,
    name: '微信用户',
  });

  const secondLogin = await context.service.loginWithOAuth({
    provider: 'wechat',
    providerAccountId: 'wechat-openid-1',
    email: 'another@example.com',
    name: 'Another Name',
  });

  assert.equal(context.users.length, 1);
  assert.equal(context.oauthAccounts.length, 1);
  assert.equal(secondLogin.user.id, context.users[0]?.id);
});
