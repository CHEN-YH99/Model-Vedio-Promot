import path from 'node:path';
import { createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';

import ytdl from 'ytdl-core';

import { HttpError } from '../utils/http-error.js';
import { saveUploadedVideoFromLocalPath } from './upload.service.js';

type SupportedVideoPlatform = 'youtube' | 'bilibili';
type MetaSource = 'live' | 'fallback';
type DownloadMode = 'downloaded' | 'sample_fallback';

interface ParsedVideoLinkMeta {
  platform: SupportedVideoPlatform;
  normalizedUrl: string;
  title: string;
  duration: number;
  qualities: string[];
  source: MetaSource;
}

function normalizeInputUrl(rawUrl: string): URL {
  try {
    return new URL(rawUrl.trim());
  } catch {
    throw new HttpError('链接格式不正确，请检查后重试', 400, 'INVALID_VIDEO_URL');
  }
}

function detectPlatform(url: URL): SupportedVideoPlatform {
  const hostname = url.hostname.toLowerCase();

  if (
    hostname === 'youtu.be' ||
    hostname === 'youtube.com' ||
    hostname === 'www.youtube.com' ||
    hostname.endsWith('.youtube.com')
  ) {
    return 'youtube';
  }

  if (
    hostname === 'bilibili.com' ||
    hostname === 'www.bilibili.com' ||
    hostname.endsWith('.bilibili.com') ||
    hostname === 'b23.tv'
  ) {
    return 'bilibili';
  }

  throw new HttpError('当前仅支持 YouTube 和 Bilibili 链接', 400, 'UNSUPPORTED_VIDEO_PLATFORM');
}

function toSafeTitle(title: string): string {
  const withoutForbiddenChars = title.trim().replace(/[<>:"/\\|?*]/g, ' ');
  const normalized = Array.from(withoutForbiddenChars)
    .filter((char) => char.charCodeAt(0) >= 32)
    .join('')
    .replace(/\s+/g, ' ');
  const shortened = normalized.slice(0, 80).trim();
  return shortened || 'imported-video';
}

function dedupeQualities(values: Array<string | undefined>): string[] {
  const set = new Set<string>();

  for (const quality of values) {
    const value = quality?.trim();
    if (!value) {
      continue;
    }
    set.add(value);
  }

  return Array.from(set);
}

function extractBilibiliBvid(url: URL): string | null {
  const match = url.pathname.match(/\/video\/(BV[0-9A-Za-z]+)/);
  return match?.[1] ?? null;
}

async function parseYoutubeMeta(url: string): Promise<ParsedVideoLinkMeta> {
  try {
    const info = await ytdl.getInfo(url);
    const duration = Number(info.videoDetails.lengthSeconds ?? 0);
    const qualities = dedupeQualities(info.formats.map((item) => item.qualityLabel));

    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error('invalid-youtube-duration');
    }

    return {
      platform: 'youtube',
      normalizedUrl: url,
      title: info.videoDetails.title ?? 'YouTube 视频',
      duration: Number(duration.toFixed(3)),
      qualities: qualities.length > 0 ? qualities : ['auto'],
      source: 'live',
    };
  } catch {
    return {
      platform: 'youtube',
      normalizedUrl: url,
      title: 'YouTube 视频（开发回退）',
      duration: 60,
      qualities: ['1080p', '720p', '480p'],
      source: 'fallback',
    };
  }
}

async function parseBilibiliMeta(url: URL): Promise<ParsedVideoLinkMeta> {
  const normalizedUrl = url.toString();
  const bvid = extractBilibiliBvid(url);

  if (!bvid) {
    return {
      platform: 'bilibili',
      normalizedUrl,
      title: 'Bilibili 视频（开发回退）',
      duration: 60,
      qualities: ['1080P', '720P', '480P'],
      source: 'fallback',
    };
  }

  try {
    const response = await fetch(
      `https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`,
      {
        headers: {
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
        },
      },
    );

    if (!response.ok) {
      throw new Error(`bilibili-http-${response.status}`);
    }

    const payload = (await response.json()) as {
      code?: number;
      data?: {
        title?: string;
        duration?: number;
      };
    };

    const duration = Number(payload.data?.duration ?? 0);
    if (payload.code !== 0 || !Number.isFinite(duration) || duration <= 0) {
      throw new Error('bilibili-api-invalid');
    }

    return {
      platform: 'bilibili',
      normalizedUrl,
      title: payload.data?.title ?? `Bilibili 视频 ${bvid}`,
      duration: Number(duration.toFixed(3)),
      qualities: ['1080P', '720P', '480P'],
      source: 'live',
    };
  } catch {
    return {
      platform: 'bilibili',
      normalizedUrl,
      title: `Bilibili 视频 ${bvid}（开发回退）`,
      duration: 60,
      qualities: ['1080P', '720P', '480P'],
      source: 'fallback',
    };
  }
}

async function fallbackToSampleVideo(input: {
  userId: string;
  uploadDir: string;
  title: string;
  platform: SupportedVideoPlatform;
}) {
  const samplePath = path.resolve(process.cwd(), 'upload-test.mp4');
  const saved = await saveUploadedVideoFromLocalPath({
    userId: input.userId,
    sourcePath: samplePath,
    uploadDir: input.uploadDir,
    originalName: `${toSafeTitle(input.title)}.mp4`,
    mimeType: 'video/mp4',
  });

  return {
    ...saved,
    platform: input.platform,
    mode: 'sample_fallback' as DownloadMode,
  };
}

async function downloadYoutubeToTempFile(url: string, destinationPath: string) {
  const stream = ytdl(url, {
    quality: 'highest',
    filter: 'audioandvideo',
  });

  await pipeline(stream, createWriteStream(destinationPath, { flags: 'wx' }));
}

export async function parseVideoLinkMeta(rawUrl: string): Promise<ParsedVideoLinkMeta> {
  const normalizedUrl = normalizeInputUrl(rawUrl);
  const platform = detectPlatform(normalizedUrl);

  if (platform === 'youtube') {
    return parseYoutubeMeta(normalizedUrl.toString());
  }

  return parseBilibiliMeta(normalizedUrl);
}

export async function downloadVideoByUrl(input: {
  userId: string;
  url: string;
  uploadDir: string;
}) {
  const meta = await parseVideoLinkMeta(input.url);

  if (meta.platform !== 'youtube') {
    const fallbackResult = await fallbackToSampleVideo({
      userId: input.userId,
      uploadDir: input.uploadDir,
      title: meta.title,
      platform: meta.platform,
    });

    return {
      ...fallbackResult,
      title: meta.title,
      duration: meta.duration,
      source: meta.source,
    };
  }

  await mkdir(input.uploadDir, { recursive: true });
  const tempPath = path.join(
    input.uploadDir,
    `url_download_${Date.now()}_${Math.random().toString(16).slice(2, 10)}.mp4`,
  );

  try {
    await downloadYoutubeToTempFile(meta.normalizedUrl, tempPath);

    const saved = await saveUploadedVideoFromLocalPath({
      userId: input.userId,
      sourcePath: tempPath,
      uploadDir: input.uploadDir,
      originalName: `${toSafeTitle(meta.title)}.mp4`,
      mimeType: 'video/mp4',
    });

    return {
      ...saved,
      platform: meta.platform,
      title: meta.title,
      duration: meta.duration,
      mode: 'downloaded' as DownloadMode,
      source: meta.source,
    };
  } catch {
    const fallbackResult = await fallbackToSampleVideo({
      userId: input.userId,
      uploadDir: input.uploadDir,
      title: meta.title,
      platform: meta.platform,
    });

    return {
      ...fallbackResult,
      title: meta.title,
      duration: meta.duration,
      source: meta.source,
    };
  } finally {
    await rm(tempPath, { force: true });
  }
}
