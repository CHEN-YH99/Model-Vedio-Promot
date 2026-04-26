import path from 'node:path';
import { randomUUID } from 'node:crypto';

import type { Prisma } from '@prisma/client';

import { analysisQueue, ANALYSIS_JOB_OPTIONS } from '../queues/analysis.queue.js';
import { prisma } from '../plugins/prisma.js';
import { redis } from '../plugins/redis.js';
import {
  extractStyleTags,
  generateOverallPromptByPlatform,
  generatePromptByPlatform,
  normalizePlatforms,
} from './analysis-prompt.service.js';
import { analyzeFrame } from './ai-analyzer.service.js';
import { consumeAnalysisQuota, getAnalysisQuotaStatus } from './quota.service.js';
import { env } from '../config/env.js';
import { HttpError } from '../utils/http-error.js';
import type {
  AnalysisConfig,
  FrameAnalysis,
  PlatformPromptContent,
  PromptLanguage,
  PromptLanguageMap,
  PromptPlatform,
} from '../types/analysis.js';

const PROMPT_LANGUAGES: PromptLanguage[] = ['zh', 'en', 'bilingual'];
const SHARE_TOKEN_TTL_SECONDS = 72 * 60 * 60;
const SHARE_KEY_PREFIX = 'analysis:share:';

type ExportFormat = 'txt' | 'json';

type AnalysisResultPayload = {
  analysisId: string;
  fileId: string;
  status: string;
  progress: number;
  errorMessage: string | null;
  config: Prisma.JsonValue;
  styleTags: string[];
  overallPrompt: Prisma.JsonValue | null;
  frames: Array<{
    id: string;
    timestamp: number;
    thumbUrl: string;
    rawAnalysis: Prisma.JsonValue;
    prompts: Prisma.JsonValue;
  }>;
};

type SampleDensity = 'low' | 'medium' | 'high';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asString(value: unknown, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function normalizeLanguage(value: unknown): PromptLanguage {
  if (value === 'zh' || value === 'en' || value === 'bilingual') {
    return value;
  }

  return 'zh';
}

function toPromptLanguageMap(value: unknown, fallback = ''): PromptLanguageMap {
  if (typeof value === 'string') {
    return {
      zh: value,
      en: value,
      bilingual: value,
    };
  }

  if (!isRecord(value)) {
    return {
      zh: fallback,
      en: fallback,
      bilingual: fallback,
    };
  }

  const zh = asString(value.zh, fallback);
  const en = asString(value.en, fallback);
  const bilingual = asString(value.bilingual, fallback);

  return {
    zh,
    en,
    bilingual,
  };
}

function hasPromptLanguageContent(map: PromptLanguageMap | undefined) {
  if (!map) {
    return false;
  }

  return PROMPT_LANGUAGES.some((language) => map[language].trim().length > 0);
}

function toPlatformPromptContent(value: unknown): PlatformPromptContent {
  if (typeof value === 'string') {
    return {
      prompt: toPromptLanguageMap(value),
    };
  }

  if (!isRecord(value)) {
    return {
      prompt: toPromptLanguageMap(''),
    };
  }

  if ('prompt' in value) {
    const prompt = toPromptLanguageMap(value.prompt);
    const negativePrompt = toPromptLanguageMap(value.negativePrompt);

    return {
      prompt,
      ...(hasPromptLanguageContent(negativePrompt) ? { negativePrompt } : {}),
    };
  }

  const prompt = toPromptLanguageMap(value);

  return {
    prompt,
  };
}

function toFrameAnalysis(raw: unknown): FrameAnalysis {
  const source = isRecord(raw) ? raw : {};

  return {
    subject: asString(source.subject, 'main subject'),
    scene: asString(source.scene, 'generic scene'),
    colorTone: asString(source.colorTone, 'balanced color tone'),
    lighting: asString(source.lighting, 'soft lighting'),
    style: asString(source.style, 'cinematic style'),
    mood: asString(source.mood, 'neutral mood'),
    cameraAngle: asString(source.cameraAngle, 'medium shot'),
    cameraMovement: asString(source.cameraMovement, 'locked camera'),
  };
}

function parseAnalysisRuntimeConfig(configRaw: Prisma.JsonValue): {
  language: PromptLanguage;
  platforms: PromptPlatform[];
} {
  const config = isRecord(configRaw) ? configRaw : {};

  const language = normalizeLanguage(config.language);

  const platformsInput = Array.isArray(config.platforms)
    ? config.platforms.filter((item): item is string => typeof item === 'string')
    : undefined;

  const platforms = normalizePlatforms(platformsInput);

  return {
    language,
    platforms,
  };
}

function parseSampleDensity(configRaw: Prisma.JsonValue): SampleDensity {
  const config = isRecord(configRaw) ? configRaw : {};
  const value = config.sampleDensity;

  if (value === 'low' || value === 'medium' || value === 'high') {
    return value;
  }

  return 'medium';
}

function resolveFrameImagePath(thumbUrl: string) {
  const uploadRoot = path.resolve(env.UPLOAD_DIR);
  const relativePath = thumbUrl.startsWith('/uploads/')
    ? thumbUrl.slice('/uploads/'.length)
    : thumbUrl.replace(/^\/+/, '');

  const decodedRelativePath = decodeURIComponent(relativePath);
  const absolutePath = path.resolve(uploadRoot, decodedRelativePath);

  if (!absolutePath.startsWith(uploadRoot)) {
    throw new HttpError('关键帧路径异常，无法重新生成', 400, 'FRAME_PATH_INVALID');
  }

  return absolutePath;
}

function getPromptTextByLanguage(input: {
  payload: unknown;
  language: PromptLanguage;
  field: 'prompt' | 'negativePrompt';
}) {
  if (input.field === 'prompt' && typeof input.payload === 'string') {
    return input.payload;
  }

  const content = toPlatformPromptContent(input.payload);
  const target = input.field === 'prompt' ? content.prompt : content.negativePrompt;

  return target?.[input.language] ?? '';
}

function serializeAnalysisResult(analysis: {
  id: string;
  fileId: string;
  status: string;
  progress: number;
  errorMessage: string | null;
  config: Prisma.JsonValue;
  styleTags: string[];
  overallPrompt: Prisma.JsonValue | null;
  frames: Array<{
    id: string;
    timestamp: number;
    thumbUrl: string;
    rawAnalysis: Prisma.JsonValue;
    prompts: Prisma.JsonValue;
  }>;
}): AnalysisResultPayload {
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

function toShareKey(token: string) {
  return `${SHARE_KEY_PREFIX}${token}`;
}

function ensureExportFormat(value: string): ExportFormat {
  if (value === 'txt' || value === 'json') {
    return value;
  }

  throw new HttpError('导出格式不支持，仅支持 txt/json', 400, 'EXPORT_FORMAT_INVALID');
}

function safeFilenameSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 40);
}

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

  await consumeAnalysisQuota({ userId: input.userId });

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

  return serializeAnalysisResult(analysis);
}

export async function getAnalysisQuota(input: { userId: string }) {
  return getAnalysisQuotaStatus({ userId: input.userId });
}

export async function getAnalysisHistory(input: {
  userId: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const limit = Math.max(1, Math.min(50, Math.floor(input.limit ?? 10)));
  const skip = (page - 1) * limit;

  const [total, analyses] = await prisma.$transaction([
    prisma.analysis.count({
      where: {
        userId: input.userId,
      },
    }),
    prisma.analysis.findMany({
      where: {
        userId: input.userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
      include: {
        _count: {
          select: {
            frames: true,
          },
        },
        frames: {
          take: 1,
          orderBy: {
            timestamp: 'asc',
          },
        },
      },
    }),
  ]);

  const items = analyses.map((analysis) => {
    const runtimeConfig = parseAnalysisRuntimeConfig(analysis.config);

    return {
      analysisId: analysis.id,
      fileId: analysis.fileId,
      status: analysis.status,
      progress: analysis.progress,
      errorMessage: analysis.errorMessage,
      sampleDensity: parseSampleDensity(analysis.config),
      platforms: runtimeConfig.platforms,
      language: runtimeConfig.language,
      frameCount: analysis._count.frames,
      coverThumbUrl: analysis.frames[0]?.thumbUrl ?? null,
      styleTags: analysis.styleTags,
      createdAt: analysis.createdAt.toISOString(),
      updatedAt: analysis.updatedAt.toISOString(),
    };
  });

  return {
    items,
    page,
    limit,
    total,
    totalPages: total > 0 ? Math.ceil(total / limit) : 0,
  };
}

export async function deleteAnalysis(input: { analysisId: string; userId: string }) {
  const analysis = await prisma.analysis.findFirst({
    where: {
      id: input.analysisId,
      userId: input.userId,
    },
    select: {
      id: true,
    },
  });

  if (!analysis) {
    throw new HttpError('分析任务不存在', 404, 'ANALYSIS_NOT_FOUND');
  }

  await prisma.analysis.delete({
    where: {
      id: analysis.id,
    },
  });

  return {
    analysisId: analysis.id,
    deleted: true,
  };
}

export async function updateFramePrompt(input: {
  analysisId: string;
  frameId: string;
  userId: string;
  platform: PromptPlatform;
  language: PromptLanguage;
  prompt: string;
  negativePrompt?: string;
}) {
  const analysis = await prisma.analysis.findFirst({
    where: {
      id: input.analysisId,
      userId: input.userId,
    },
  });

  if (!analysis) {
    throw new HttpError('分析任务不存在', 404, 'ANALYSIS_NOT_FOUND');
  }

  const frame = await prisma.frame.findFirst({
    where: {
      id: input.frameId,
      analysisId: input.analysisId,
    },
  });

  if (!frame) {
    throw new HttpError('关键帧不存在', 404, 'ANALYSIS_FRAME_NOT_FOUND');
  }

  const promptText = input.prompt.trim();
  if (!promptText) {
    throw new HttpError('提示词内容不能为空', 400, 'PROMPT_EMPTY');
  }

  const promptMap: Record<string, Prisma.JsonValue> = isRecord(frame.prompts)
    ? { ...(frame.prompts as Record<string, Prisma.JsonValue>) }
    : {};
  const currentPlatformPrompt = toPlatformPromptContent(promptMap[input.platform]);

  const nextPrompt: PlatformPromptContent = {
    ...currentPlatformPrompt,
    prompt: {
      ...currentPlatformPrompt.prompt,
      [input.language]: promptText,
    },
  };

  if (input.negativePrompt !== undefined) {
    const normalizedNegativePrompt = input.negativePrompt.trim();
    const nextNegativePrompt = {
      ...(currentPlatformPrompt.negativePrompt ?? toPromptLanguageMap('')),
      [input.language]: normalizedNegativePrompt,
    };

    if (hasPromptLanguageContent(nextNegativePrompt)) {
      nextPrompt.negativePrompt = nextNegativePrompt;
    } else {
      delete nextPrompt.negativePrompt;
    }
  }

  promptMap[input.platform] = nextPrompt as unknown as Prisma.JsonValue;

  const updatedFrame = await prisma.frame.update({
    where: {
      id: frame.id,
    },
    data: {
      prompts: promptMap as Prisma.InputJsonValue,
    },
  });

  return {
    frame: {
      id: updatedFrame.id,
      timestamp: updatedFrame.timestamp,
      thumbUrl: updatedFrame.thumbUrl,
      rawAnalysis: updatedFrame.rawAnalysis,
      prompts: updatedFrame.prompts,
    },
    overallPrompt: analysis.overallPrompt,
    styleTags: analysis.styleTags,
  };
}

export async function regenerateFramePrompt(input: {
  analysisId: string;
  frameId: string;
  userId: string;
}) {
  const analysis = await prisma.analysis.findFirst({
    where: {
      id: input.analysisId,
      userId: input.userId,
    },
  });

  if (!analysis) {
    throw new HttpError('分析任务不存在', 404, 'ANALYSIS_NOT_FOUND');
  }

  const frame = await prisma.frame.findFirst({
    where: {
      id: input.frameId,
      analysisId: input.analysisId,
    },
  });

  if (!frame) {
    throw new HttpError('关键帧不存在', 404, 'ANALYSIS_FRAME_NOT_FOUND');
  }

  const config = parseAnalysisRuntimeConfig(analysis.config);
  const frameImagePath = resolveFrameImagePath(frame.thumbUrl);

  const rawAnalysis = await analyzeFrame({
    timestamp: frame.timestamp,
    language: config.language,
    imagePath: frameImagePath,
  });

  const prompts = config.platforms.reduce<Partial<Record<PromptPlatform, PlatformPromptContent>>>(
    (acc, platform) => {
      acc[platform] = generatePromptByPlatform({
        platform,
        analysis: rawAnalysis,
      });
      return acc;
    },
    {},
  );

  const updatedFrame = await prisma.frame.update({
    where: {
      id: frame.id,
    },
    data: {
      rawAnalysis: rawAnalysis as unknown as Prisma.InputJsonValue,
      prompts: prompts as unknown as Prisma.InputJsonValue,
    },
  });

  const allFrames = await prisma.frame.findMany({
    where: {
      analysisId: input.analysisId,
    },
    orderBy: {
      timestamp: 'asc',
    },
  });

  const normalizedAnalyses = allFrames.map((item) => toFrameAnalysis(item.rawAnalysis));
  const overallPrompt = generateOverallPromptByPlatform({
    frames: normalizedAnalyses,
    platforms: config.platforms,
  });
  const styleTags = extractStyleTags(normalizedAnalyses);

  await prisma.analysis.update({
    where: {
      id: input.analysisId,
    },
    data: {
      overallPrompt: overallPrompt as unknown as Prisma.InputJsonValue,
      styleTags,
    },
  });

  return {
    frame: {
      id: updatedFrame.id,
      timestamp: updatedFrame.timestamp,
      thumbUrl: updatedFrame.thumbUrl,
      rawAnalysis: updatedFrame.rawAnalysis,
      prompts: updatedFrame.prompts,
    },
    overallPrompt,
    styleTags,
  };
}

export async function exportAnalysisResult(input: {
  analysisId: string;
  userId: string;
  format: string;
  platform?: PromptPlatform;
  language?: PromptLanguage;
}) {
  const format = ensureExportFormat(input.format);

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

  const runtimeConfig = parseAnalysisRuntimeConfig(analysis.config);
  const platform = input.platform ?? runtimeConfig.platforms[0] ?? 'sora';
  const language = input.language ?? runtimeConfig.language;

  const overallPayload = isRecord(analysis.overallPrompt) ? analysis.overallPrompt[platform] : undefined;
  const overallPrompt = getPromptTextByLanguage({
    payload: overallPayload,
    language,
    field: 'prompt',
  });
  const overallNegativePrompt = getPromptTextByLanguage({
    payload: overallPayload,
    language,
    field: 'negativePrompt',
  });

  const frameExports = analysis.frames.map((frame, index) => {
    const platformPayload = isRecord(frame.prompts) ? frame.prompts[platform] : undefined;

    return {
      index: index + 1,
      id: frame.id,
      timestamp: frame.timestamp,
      thumbUrl: frame.thumbUrl,
      rawAnalysis: frame.rawAnalysis,
      prompt: getPromptTextByLanguage({
        payload: platformPayload,
        language,
        field: 'prompt',
      }),
      negativePrompt: getPromptTextByLanguage({
        payload: platformPayload,
        language,
        field: 'negativePrompt',
      }),
    };
  });

  const safePlatform = safeFilenameSegment(platform);
  const safeLanguage = safeFilenameSegment(language);
  const baseName = `analysis_${safeFilenameSegment(analysis.id)}_${safePlatform}_${safeLanguage}`;

  if (format === 'json') {
    return {
      fileName: `${baseName}.json`,
      contentType: 'application/json; charset=utf-8',
      content: {
        analysisId: analysis.id,
        fileId: analysis.fileId,
        platform,
        language,
        styleTags: analysis.styleTags,
        overallPrompt,
        overallNegativePrompt,
        frames: frameExports,
      },
    };
  }

  const lines: string[] = [];

  lines.push(`analysisId: ${analysis.id}`);
  lines.push(`fileId: ${analysis.fileId}`);
  lines.push(`platform: ${platform}`);
  lines.push(`language: ${language}`);
  lines.push('');
  lines.push('[Overall Prompt]');
  lines.push(overallPrompt || '(empty)');
  lines.push('');

  if (overallNegativePrompt) {
    lines.push('[Overall Negative Prompt]');
    lines.push(overallNegativePrompt);
    lines.push('');
  }

  for (const frame of frameExports) {
    lines.push(`[Frame ${frame.index}] id=${frame.id} timestamp=${frame.timestamp.toFixed(3)}s`);
    lines.push(frame.prompt || '(empty)');

    if (frame.negativePrompt) {
      lines.push('[Negative Prompt]');
      lines.push(frame.negativePrompt);
    }

    lines.push('');
  }

  return {
    fileName: `${baseName}.txt`,
    contentType: 'text/plain; charset=utf-8',
    content: lines.join('\n'),
  };
}

export async function createAnalysisShare(input: { analysisId: string; userId: string }) {
  const analysis = await prisma.analysis.findFirst({
    where: {
      id: input.analysisId,
      userId: input.userId,
    },
    select: {
      id: true,
    },
  });

  if (!analysis) {
    throw new HttpError('分析任务不存在', 404, 'ANALYSIS_NOT_FOUND');
  }

  const token = randomUUID().replace(/-/g, '');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SHARE_TOKEN_TTL_SECONDS * 1000);

  await redis.set(
    toShareKey(token),
    JSON.stringify({
      analysisId: analysis.id,
      createdAt: now.toISOString(),
    }),
    'EX',
    SHARE_TOKEN_TTL_SECONDS,
  );

  return {
    token,
    sharePath: `/share/${token}`,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function getSharedAnalysisResult(input: { token: string }) {
  const key = toShareKey(input.token);
  const raw = await redis.get(key);

  if (!raw) {
    throw new HttpError('分享链接已失效', 410, 'SHARE_EXPIRED');
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new HttpError('分享链接状态异常', 500, 'SHARE_STATE_INVALID');
  }

  if (!isRecord(parsed) || typeof parsed.analysisId !== 'string') {
    throw new HttpError('分享链接状态异常', 500, 'SHARE_STATE_INVALID');
  }

  const analysis = await prisma.analysis.findUnique({
    where: {
      id: parsed.analysisId,
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
    throw new HttpError('分享内容已不存在', 410, 'SHARE_TARGET_NOT_FOUND');
  }

  const ttlSeconds = await redis.ttl(key);
  const expiresAt = ttlSeconds > 0 ? new Date(Date.now() + ttlSeconds * 1000).toISOString() : null;

  return {
    ...serializeAnalysisResult(analysis),
    shareToken: input.token,
    expiresAt,
  };
}
