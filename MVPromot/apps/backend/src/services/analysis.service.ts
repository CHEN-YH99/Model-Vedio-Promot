import type { Prisma } from '@prisma/client';

import { analysisQueue, ANALYSIS_JOB_OPTIONS } from '../queues/analysis.queue.js';
import { prisma } from '../plugins/prisma.js';
import { HttpError } from '../utils/http-error.js';
import type { AnalysisConfig } from '../types/analysis.js';

export async function startAnalysisTask(input: {
  userId: string;
  fileId: string;
  config: AnalysisConfig;
}) {
  const uploadedFile = await prisma.uploadedFile.findFirst({
    where: {
      id: input.fileId,
      userId: input.userId,
    },
  });

  if (!uploadedFile) {
    throw new HttpError('未找到上传文件，请先上传视频', 404, 'UPLOAD_FILE_NOT_FOUND');
  }

  const analysis = await prisma.analysis.create({
    data: {
      userId: input.userId,
      fileId: input.fileId,
      status: 'PENDING',
      progress: 0,
      config: input.config as unknown as Prisma.InputJsonValue,
      styleTags: [],
    },
  });

  await analysisQueue.add(
    'analysis:run',
    {
      analysisId: analysis.id,
      userId: input.userId,
      fileId: input.fileId,
      config: input.config,
    },
    {
      ...ANALYSIS_JOB_OPTIONS,
      jobId: analysis.id,
    },
  );

  return { analysisId: analysis.id };
}

export async function getAnalysisStatus(input: { analysisId: string; userId: string }) {
  const analysis = await prisma.analysis.findFirst({
    where: {
      id: input.analysisId,
      userId: input.userId,
    },
    include: {
      _count: {
        select: {
          frames: true,
        },
      },
    },
  });

  if (!analysis) {
    throw new HttpError('分析任务不存在', 404, 'ANALYSIS_NOT_FOUND');
  }

  return {
    analysisId: analysis.id,
    status: analysis.status,
    progress: analysis.progress,
    errorMessage: analysis.errorMessage,
    frameCount: analysis._count.frames,
    createdAt: analysis.createdAt.toISOString(),
    updatedAt: analysis.updatedAt.toISOString(),
  };
}

export async function getAnalysisResult(input: { analysisId: string; userId: string }) {
  const analysis = await prisma.analysis.findFirst({
    where: {
      id: input.analysisId,
      userId: input.userId,
    },
    include: {
      frames: {
        orderBy: {
          timestamp: 'asc',
        },
      },
    },
  });

  if (!analysis) {
    throw new HttpError('分析任务不存在', 404, 'ANALYSIS_NOT_FOUND');
  }

  return {
    analysisId: analysis.id,
    fileId: analysis.fileId,
    status: analysis.status,
    progress: analysis.progress,
    errorMessage: analysis.errorMessage,
    config: analysis.config,
    styleTags: analysis.styleTags,
    overallPrompt: analysis.overallPrompt,
    frames: analysis.frames.map((frame) => ({
      id: frame.id,
      timestamp: frame.timestamp,
      thumbUrl: frame.thumbUrl,
      rawAnalysis: frame.rawAnalysis,
      prompts: frame.prompts,
    })),
  };
}
