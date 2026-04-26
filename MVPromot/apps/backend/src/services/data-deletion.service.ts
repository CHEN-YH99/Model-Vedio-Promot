import { Prisma } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';

import { env } from '../config/env.js';
import { prisma } from '../plugins/prisma.js';
import { HttpError } from '../utils/http-error.js';
import { revokeUserSessions } from './auth.service.js';

const MAX_REASON_LENGTH = 500;

function normalizeReason(reason: string | undefined) {
  if (!reason) {
    return null;
  }

  const normalized = Array.from(reason.trim())
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('')
    .slice(0, MAX_REASON_LENGTH);
  return normalized.length > 0 ? normalized : null;
}

function toDeletionResponse(record: {
  id: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELED' | 'FAILED';
  requestedAt: Date;
  executeAfter: Date;
  processedAt: Date | null;
  failureReason: string | null;
  reason: string | null;
}) {
  return {
    requestId: record.id,
    status: record.status,
    requestedAt: record.requestedAt.toISOString(),
    executeAfter: record.executeAfter.toISOString(),
    processedAt: record.processedAt?.toISOString() ?? null,
    failureReason: record.failureReason,
    reason: record.reason,
  };
}

export async function createDataDeletionRequest(input: { userId: string; reason?: string }) {
  const user = await prisma.user.findUnique({
    where: {
      id: input.userId,
    },
    select: {
      id: true,
      email: true,
    },
  });

  if (!user) {
    throw new HttpError('用户不存在或已删除', 404, 'USER_NOT_FOUND');
  }

  const pending = await prisma.dataDeletionRequest.findFirst({
    where: {
      userId: input.userId,
      status: 'PENDING',
    },
    orderBy: {
      requestedAt: 'desc',
    },
  });

  if (pending) {
    return {
      ...toDeletionResponse(pending),
      alreadyPending: true,
    };
  }

  const now = Date.now();
  const executeAfter = new Date(now + env.DATA_DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);

  const requestRecord = await prisma.dataDeletionRequest.create({
    data: {
      userId: input.userId,
      emailSnapshot: user.email,
      reason: normalizeReason(input.reason),
      status: 'PENDING',
      executeAfter,
    },
  });

  await revokeUserSessions(input.userId);

  return {
    ...toDeletionResponse(requestRecord),
    alreadyPending: false,
  };
}

export async function getLatestDataDeletionRequest(input: { userId: string }) {
  const latest = await prisma.dataDeletionRequest.findFirst({
    where: {
      userId: input.userId,
    },
    orderBy: {
      requestedAt: 'desc',
    },
  });

  if (!latest) {
    return null;
  }

  return toDeletionResponse(latest);
}

export async function cancelPendingDataDeletionRequest(input: { userId: string }) {
  const pending = await prisma.dataDeletionRequest.findFirst({
    where: {
      userId: input.userId,
      status: 'PENDING',
    },
    orderBy: {
      requestedAt: 'desc',
    },
  });

  if (!pending) {
    throw new HttpError('当前没有待执行的数据删除申请', 404, 'DELETION_REQUEST_NOT_FOUND');
  }

  const canceled = await prisma.dataDeletionRequest.update({
    where: {
      id: pending.id,
    },
    data: {
      status: 'CANCELED',
      processedAt: new Date(),
      failureReason: null,
    },
  });

  return toDeletionResponse(canceled);
}

async function markDeletionFailed(input: { requestId: string; reason: string }) {
  await prisma.dataDeletionRequest.update({
    where: {
      id: input.requestId,
    },
    data: {
      status: 'FAILED',
      processedAt: new Date(),
      failureReason: input.reason.slice(0, 500),
    },
  });
}

async function executeSingleDeletion(request: {
  id: string;
  userId: string;
}) {
  await prisma.$transaction(async (transaction) => {
    try {
      await transaction.user.delete({
        where: {
          id: request.userId,
        },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025')) {
        throw error;
      }
    }

    await transaction.dataDeletionRequest.update({
      where: {
        id: request.id,
      },
      data: {
        status: 'COMPLETED',
        processedAt: new Date(),
        failureReason: null,
      },
    });
  });
}

export async function processDueDataDeletionRequests(logger?: FastifyBaseLogger) {
  const dueRequests = await prisma.dataDeletionRequest.findMany({
    where: {
      status: 'PENDING',
      executeAfter: {
        lte: new Date(),
      },
    },
    take: 20,
    orderBy: {
      executeAfter: 'asc',
    },
  });

  if (dueRequests.length === 0) {
    return 0;
  }

  let successCount = 0;

  for (const request of dueRequests) {
    try {
      await executeSingleDeletion({
        id: request.id,
        userId: request.userId,
      });
      successCount += 1;
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown';
      await markDeletionFailed({
        requestId: request.id,
        reason,
      });
      logger?.error({ requestId: request.id, err: error }, '执行用户数据删除失败');
    }
  }

  return successCount;
}
