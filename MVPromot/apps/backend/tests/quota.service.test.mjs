import assert from 'node:assert/strict';
import { test } from 'node:test';

const { createQuotaService } = await import('../dist/services/quota.service.js');
const { HttpError } = await import('../dist/utils/http-error.js');

function createContext(input = {}) {
  const {
    plan = 'FREE',
    dailyQuota = 3,
    nowMs = Date.parse('2026-04-26T15:59:30.000Z'),
  } = input;

  const kv = new Map();

  const service = createQuotaService({
    findUserById: async (userId) => ({
      id: userId,
      plan,
      dailyQuota,
    }),
    redisGet: async (key) => kv.get(key) ?? null,
    redisEval: async (_script, _numKeys, key, limitRaw) => {
      const limit = Number(limitRaw);
      const current = Number(kv.get(key) ?? '0');

      if (!kv.has(key)) {
        kv.set(key, '1');
        return 1;
      }

      if (current >= limit) {
        return -1;
      }

      const next = current + 1;
      kv.set(key, String(next));
      return next;
    },
    nowMs: () => nowMs,
  });

  return {
    service,
  };
}

test('consumeAnalysisQuota 在免费版会递增并在达到上限后拦截', async () => {
  const { service } = createContext({
    plan: 'FREE',
    dailyQuota: 2,
  });

  const first = await service.consumeAnalysisQuota({ userId: 'user_free' });
  assert.equal(first.used, 1);
  assert.equal(first.remaining, 1);

  const second = await service.consumeAnalysisQuota({ userId: 'user_free' });
  assert.equal(second.used, 2);
  assert.equal(second.remaining, 0);
  assert.equal(second.exceeded, true);

  await assert.rejects(
    async () => {
      await service.consumeAnalysisQuota({ userId: 'user_free' });
    },
    (error) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 429);
      assert.equal(error.code, 'QUOTA_EXCEEDED');
      return true;
    },
  );
});

test('getAnalysisQuotaStatus 能返回免费版当日配额状态与重置时间', async () => {
  const { service } = createContext({
    plan: 'FREE',
    dailyQuota: 3,
    nowMs: Date.parse('2026-04-26T15:59:30.000Z'),
  });

  await service.consumeAnalysisQuota({ userId: 'user_free' });
  await service.consumeAnalysisQuota({ userId: 'user_free' });

  const status = await service.getAnalysisQuotaStatus({ userId: 'user_free' });
  assert.equal(status.limit, 3);
  assert.equal(status.used, 2);
  assert.equal(status.remaining, 1);
  assert.equal(status.isUnlimited, false);
  assert.equal(status.resetAt, '2026-04-26T16:00:00.000Z');
});

test('PRO 配额应为无限制', async () => {
  const { service } = createContext({
    plan: 'PRO',
    dailyQuota: 999,
  });

  const status = await service.getAnalysisQuotaStatus({ userId: 'user_pro' });
  assert.equal(status.isUnlimited, true);
  assert.equal(status.limit, null);
  assert.equal(status.remaining, null);
  assert.equal(status.exceeded, false);

  const consumed = await service.consumeAnalysisQuota({ userId: 'user_pro' });
  assert.equal(consumed.isUnlimited, true);
  assert.equal(consumed.used, 0);
});
