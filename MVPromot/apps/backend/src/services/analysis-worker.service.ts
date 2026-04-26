import type { FastifyBaseLogger } from 'fastify';
import type { Processor } from 'bullmq';
import type { Prisma } from '@prisma/client';

import { env } from '../config/env.js';
import { createAnalysisWorker } from '../queues/analysis.queue.js';
import { prisma } from '../plugins/prisma.js';
import { createAnalysisCacheKey, setCachedAnalysisId } from './analysis-cache.service.js';
import { analyzeFrame } from './ai-analyzer.service.js';
import {
  extractStyleTags,
  generateOverallPromptByPlatform,
  generatePromptByPlatform,
} from './analysis-prompt.service.js';
import { collectFrameTimestamps, extractFrames } from './frame-extractor.service.js';
import { HttpError } from '../utils/http-error.js';
import type {
  AnalysisConfig,
  FrameAnalysis,
  PlatformPromptContent,
  PromptPlatform,
} from '../types/analysis.js';

async function updateAnalysis(
  analysisId: string,
  data: {
    status?: 'PENDING' | 'EXTRACTING' | 'ANALYZING' | 'DONE' | 'FAILED';
    progress?: number;
    errorMessage?: string | null;
    overallPrompt?: Prisma.InputJsonValue;
    styleTags?: string[];
  },
) {
  await prisma.analysis.update({
    where: { id: analysisId },
    data,
  });
}

async function processAnalysis(input: {
  analysisId: string;
  userId: string;
  fileId: string;
  config: AnalysisConfig;
  logger?: FastifyBaseLogger;
}) {
  const uploaded = await prisma.uploadedFile.findFirst({
    where: {
      id: input.fileId,
      userId: input.userId,
    },
  });

  if (!uploaded) {
    throw new HttpError('上传文件不存在，无法开始分析', 404, 'UPLOAD_FILE_NOT_FOUND');
  }

  const duration = uploaded.duration ?? 0;
  if (duration <= 0) {
    throw new HttpError('上传文件缺少时长信息，无法提取关键帧', 422, 'INVALID_UPLOAD_DURATION');
  }

  await updateAnalysis(input.analysisId, {
    status: 'EXTRACTING',
    progress: 5,
    errorMessage: null,
  });

  const timestamps = await collectFrameTimestamps({
    sourcePath: uploaded.path,
    duration,
    sampleDensity: input.config.sampleDensity,
    onSceneDetectionFallback: (message) => {
      input.logger?.warn({ analysisId: input.analysisId, message }, '场景检测失败，已回退到均匀采样');
    },
  });

  const frames = await extractFrames({
    sourcePath: uploaded.path,
    analysisId: input.analysisId,
    timestamps,
    uploadDir: env.UPLOAD_DIR,
    onProgress: async (completed, total) => {
      const progress = 5 + Math.round((completed / total) * 40);
      await updateAnalysis(input.analysisId, { progress });
    },
  });

  await updateAnalysis(input.analysisId, {
    status: 'ANALYZING',
    progress: 50,
  });

  await prisma.frame.deleteMany({
    where: {
      analysisId: input.analysisId,
    },
  });

  const frameAnalyses: FrameAnalysis[] = [];

  for (const [index, frame] of frames.entries()) {
    const rawAnalysis = await analyzeFrame({
      timestamp: frame.timestamp,
      language: input.config.language,
      imagePath: frame.absolutePath,
    });

    frameAnalyses.push(rawAnalysis);

    const prompts = input.config.platforms.reduce<
      Partial<Record<PromptPlatform, PlatformPromptContent>>
    >((acc, platform) => {
      acc[platform] = generatePromptByPlatform({
        platform,
        analysis: rawAnalysis,
      });
      return acc;
    }, {});

    await prisma.frame.create({
      data: {
        analysisId: input.analysisId,
        timestamp: frame.timestamp,
        thumbUrl: frame.thumbUrl,
        rawAnalysis: rawAnalysis as unknown as Prisma.InputJsonValue,
        prompts: prompts as unknown as Prisma.InputJsonValue,
      },
    });

    const progress = 50 + Math.round(((index + 1) / frames.length) * 45);
    await updateAnalysis(input.analysisId, { progress });
  }

  const overallPrompt = generateOverallPromptByPlatform({
    frames: frameAnalyses,
    platforms: input.config.platforms as PromptPlatform[],
  });

  const styleTags = extractStyleTags(frameAnalyses);

  await updateAnalysis(input.analysisId, {
    status: 'DONE',
    progress: 100,
    overallPrompt: overallPrompt as Prisma.InputJsonValue,
    styleTags,
    errorMessage: null,
  });

  const cacheKey = createAnalysisCacheKey({
    userId: input.userId,
    fileId: input.fileId,
    config: input.config,
  });
  await setCachedAnalysisId(cacheKey, input.analysisId);
}

export function startAnalysisWorker(logger: FastifyBaseLogger) {
  const processor: Processor = async (job) => {
    const { analysisId, userId, fileId, config } = job.data;

    try {
      await processAnalysis({
        analysisId,
        userId,
        fileId,
        config,
        logger,
      });
      logger.info({ analysisId }, '分析任务完成');
    } catch (error) {
      const message = error instanceof HttpError ? error.message : '分析任务执行失败';

      await updateAnalysis(analysisId, {
        status: 'FAILED',
        errorMessage: message,
      }).catch(() => {
        logger.error({ analysisId }, '写入失败状态时发生错误');
      });

      logger.error({ err: error, analysisId }, '分析任务失败');
      throw error;
    }
  };

  const worker = createAnalysisWorker(processor);

  worker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, err: error }, '分析队列 worker 处理失败');
  });

  worker.on('error', (error) => {
    logger.error({ err: error }, '分析队列 worker 异常');
  });

  return async () => {
    await worker.close();
  };
}
