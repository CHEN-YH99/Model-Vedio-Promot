import { HttpError } from '../utils/http-error.js';

type UserPlan = 'FREE' | 'PRO' | 'ENTERPRISE';

interface QuotaUserRecord {
  id: string;
  plan: UserPlan;
  dailyQuota: number;
}

interface QuotaServiceDependencies {
  findUserById(userId: string): Promise<QuotaUserRecord | null>;
  redisGet(key: string): Promise<string | null>;
  redisEval(
    script: string,
    numKeys: number,
    key: string,
    limit: string,
    ttlSeconds: string,
  ): Promise<unknown>;
  nowMs(): number;
}

export interface AnalysisQuotaStatus {
  plan: UserPlan;
  limit: number | null;
  used: number;
  remaining: number | null;
  isUnlimited: boolean;
  exceeded: boolean;
  resetAt: string;
}

const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;
const DEFAULT_DAILY_QUOTA = 3;
const QUOTA_KEY_PREFIX = 'quota:daily:';

const QUOTA_CONSUME_SCRIPT = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])

local current = redis.call('GET', key)
if (not current) then
  redis.call('SET', key, 1, 'EX', ttl)
  return 1
end

current = tonumber(current)
if (current >= limit) then
  return -1
end

local next = redis.call('INCR', key)
local keyTtl = redis.call('TTL', key)
if (keyTtl < 0) then
  redis.call('EXPIRE', key, ttl)
end

return next
`;

function normalizeQuota(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_DAILY_QUOTA;
  }

  return Math.max(1, Math.floor(value));
}

function parseUsed(value: string | null) {
  if (!value) {
    return 0;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

function getShanghaiDayContext(nowMs: number) {
  const shanghaiNow = new Date(nowMs + SHANGHAI_OFFSET_MS);

  const year = shanghaiNow.getUTCFullYear();
  const month = shanghaiNow.getUTCMonth() + 1;
  const day = shanghaiNow.getUTCDate();

  const dayKey = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;

  const nextMidnightUtcMs = Date.UTC(year, month - 1, day + 1, 0, 0, 0) - SHANGHAI_OFFSET_MS;
  const ttlSeconds = Math.max(1, Math.ceil((nextMidnightUtcMs - nowMs) / 1000));

  return {
    dayKey,
    resetAt: new Date(nextMidnightUtcMs).toISOString(),
    ttlSeconds,
  };
}

function toQuotaKey(userId: string, dayKey: string) {
  return `${QUOTA_KEY_PREFIX}${userId}:${dayKey}`;
}

export function createQuotaService(dependencies: QuotaServiceDependencies) {
  async function getUserOrThrow(userId: string) {
    const user = await dependencies.findUserById(userId);

    if (!user) {
      throw new HttpError('用户不存在', 404, 'USER_NOT_FOUND');
    }

    return user;
  }

  async function getAnalysisQuotaStatus(input: { userId: string }): Promise<AnalysisQuotaStatus> {
    const user = await getUserOrThrow(input.userId);
    const dayContext = getShanghaiDayContext(dependencies.nowMs());

    if (user.plan !== 'FREE') {
      return {
        plan: user.plan,
        limit: null,
        used: 0,
        remaining: null,
        isUnlimited: true,
        exceeded: false,
        resetAt: dayContext.resetAt,
      };
    }

    const limit = normalizeQuota(user.dailyQuota);
    const quotaKey = toQuotaKey(user.id, dayContext.dayKey);
    const used = parseUsed(await dependencies.redisGet(quotaKey));

    return {
      plan: user.plan,
      limit,
      used,
      remaining: Math.max(limit - used, 0),
      isUnlimited: false,
      exceeded: used >= limit,
      resetAt: dayContext.resetAt,
    };
  }

  async function assertAnalysisQuotaAvailable(input: { userId: string }) {
    const status = await getAnalysisQuotaStatus(input);

    if (status.exceeded && status.limit !== null) {
      throw new HttpError(
        `免费版今日配额已用完（${status.used}/${status.limit}），请明天再试或升级 Pro。`,
        429,
        'QUOTA_EXCEEDED',
      );
    }

    return status;
  }

  async function consumeAnalysisQuota(input: { userId: string }): Promise<AnalysisQuotaStatus> {
    const user = await getUserOrThrow(input.userId);
    const dayContext = getShanghaiDayContext(dependencies.nowMs());

    if (user.plan !== 'FREE') {
      return {
        plan: user.plan,
        limit: null,
        used: 0,
        remaining: null,
        isUnlimited: true,
        exceeded: false,
        resetAt: dayContext.resetAt,
      };
    }

    const limit = normalizeQuota(user.dailyQuota);
    const quotaKey = toQuotaKey(user.id, dayContext.dayKey);

    const consumedRaw = await dependencies.redisEval(
      QUOTA_CONSUME_SCRIPT,
      1,
      quotaKey,
      String(limit),
      String(dayContext.ttlSeconds),
    );

    const consumed = Number(consumedRaw);

    if (consumed === -1) {
      throw new HttpError(
        `免费版今日配额已用完（${limit}/${limit}），请明天再试或升级 Pro。`,
        429,
        'QUOTA_EXCEEDED',
      );
    }

    if (!Number.isFinite(consumed) || consumed < 0) {
      throw new HttpError('配额状态异常，请稍后重试', 500, 'QUOTA_STATE_INVALID');
    }

    return {
      plan: user.plan,
      limit,
      used: consumed,
      remaining: Math.max(limit - consumed, 0),
      isUnlimited: false,
      exceeded: consumed >= limit,
      resetAt: dayContext.resetAt,
    };
  }

  return {
    getAnalysisQuotaStatus,
    assertAnalysisQuotaAvailable,
    consumeAnalysisQuota,
  };
}

let defaultQuotaServicePromise: Promise<ReturnType<typeof createQuotaService>> | null = null;

async function getDefaultQuotaService() {
  if (!defaultQuotaServicePromise) {
    defaultQuotaServicePromise = (async () => {
      const [{ prisma }, { redis }] = await Promise.all([
        import('../plugins/prisma.js'),
        import('../plugins/redis.js'),
      ]);

      return createQuotaService({
        findUserById: (userId) =>
          prisma.user.findUnique({
            where: {
              id: userId,
            },
            select: {
              id: true,
              plan: true,
              dailyQuota: true,
            },
          }),
        redisGet: (key) => redis.get(key),
        redisEval: (script, numKeys, key, limit, ttlSeconds) =>
          redis.eval(script, numKeys, key, limit, ttlSeconds),
        nowMs: () => Date.now(),
      });
    })();
  }

  return defaultQuotaServicePromise;
}

export async function getAnalysisQuotaStatus(input: { userId: string }) {
  const service = await getDefaultQuotaService();
  return service.getAnalysisQuotaStatus(input);
}

export async function assertAnalysisQuotaAvailable(input: { userId: string }) {
  const service = await getDefaultQuotaService();
  return service.assertAnalysisQuotaAvailable(input);
}

export async function consumeAnalysisQuota(input: { userId: string }) {
  const service = await getDefaultQuotaService();
  return service.consumeAnalysisQuota(input);
}
