import path from 'node:path';
import { createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';

import ytdl from 'ytdl-core';

import type { DownloadVideoUrlResult, UrlMetaSource, UrlVideoPlatform } from '../types/upload-url.js';
import { HttpError } from '../utils/http-error.js';
import { saveUploadedVideoFromLocalPath } from './upload.service.js';

type SupportedVideoPlatform = UrlVideoPlatform;
type MetaSource = UrlMetaSource;
type DownloadMode = DownloadVideoUrlResult['mode'];

const META_TIMEOUT_MS = 20_000;
const DEFAULT_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
};
const BILIBILI_HEADERS = {
  ...DEFAULT_HEADERS,
  referer: 'https://www.bilibili.com',
};

interface ParsedVideoLinkMeta {
  platform: SupportedVideoPlatform;
  normalizedUrl: string;
  title: string;
  duration: number;
  qualities: string[];
  source: MetaSource;
}

interface ResolvedBilibiliMeta extends ParsedVideoLinkMeta {
  bvid: string;
  cid: number;
}

interface BilibiliViewPayload {
  code?: number;
  message?: string;
  data?: {
    title?: string;
    duration?: number;
    cid?: number;
    pages?: Array<{
      cid?: number;
      duration?: number;
    }>;
  };
}

interface BilibiliPlayUrlPayload {
  code?: number;
  message?: string;
  data?: {
    durl?: Array<{
      url?: string;
      backup_url?: string[];
    }>;
  };
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
    hostname === 'b23.tv' ||
    hostname.endsWith('.b23.tv')
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

function normalizeBilibiliBvid(value: string): string | null {
  const trimmed = value.trim();

  if (!/^BV[0-9A-Za-z]+$/i.test(trimmed)) {
    return null;
  }

  return `BV${trimmed.slice(2)}`;
}

function extractBilibiliBvid(url: URL): string | null {
  const match = url.pathname.match(/\/video\/(BV[0-9A-Za-z]+)/i);
  if (match?.[1]) {
    return normalizeBilibiliBvid(match[1]);
  }

  const queryBvid = url.searchParams.get('bvid');
  if (queryBvid) {
    return normalizeBilibiliBvid(queryBvid);
  }

  return null;
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
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim().length > 0
        ? `YouTube 链接解析失败：${error.message}`
        : 'YouTube 链接解析失败，可能是私密视频、受限视频或网络异常';
    throw new HttpError(message, 400, 'YOUTUBE_META_FAILED');
  }
}

function mapBilibiliApiError(code: number | undefined, message: string | undefined) {
  if (code === -404 || code === 62002) {
    return 'Bilibili 视频不存在或已删除';
  }

  if (code === -10403) {
    return 'Bilibili 视频受地区限制，当前无法访问';
  }

  if (message && message.trim().length > 0) {
    return `Bilibili 接口返回异常：${message}`;
  }

  return 'Bilibili 接口返回异常';
}

async function fetchJsonWithTimeout<T>(input: {
  url: string;
  headers?: Record<string, string>;
  errorMessage: string;
  errorCode: string;
}) {
  let response: Response;

  try {
    response = await fetch(input.url, {
      headers: input.headers,
      signal: AbortSignal.timeout(META_TIMEOUT_MS),
    });
  } catch {
    throw new HttpError(`${input.errorMessage}（网络超时或连接失败）`, 502, input.errorCode);
  }

  if (!response.ok) {
    throw new HttpError(`${input.errorMessage}（HTTP ${response.status}）`, 502, input.errorCode);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new HttpError(`${input.errorMessage}（响应格式异常）`, 502, input.errorCode);
  }
}

async function resolveBilibiliUrl(url: URL): Promise<URL> {
  const hostname = url.hostname.toLowerCase();
  if (hostname !== 'b23.tv' && !hostname.endsWith('.b23.tv')) {
    return url;
  }

  let response: Response;

  try {
    response = await fetch(url.toString(), {
      headers: DEFAULT_HEADERS,
      redirect: 'follow',
      signal: AbortSignal.timeout(META_TIMEOUT_MS),
    });
  } catch {
    throw new HttpError('Bilibili 短链解析失败，请稍后重试', 502, 'BILIBILI_SHORT_LINK_FAILED');
  }

  if (!response.ok) {
    throw new HttpError(
      `Bilibili 短链解析失败（HTTP ${response.status}）`,
      502,
      'BILIBILI_SHORT_LINK_FAILED',
    );
  }

  try {
    return new URL(response.url);
  } catch {
    throw new HttpError('Bilibili 短链解析失败，返回地址不合法', 502, 'BILIBILI_SHORT_LINK_FAILED');
  }
}

async function resolveBilibiliMeta(url: URL): Promise<ResolvedBilibiliMeta> {
  const resolvedUrl = await resolveBilibiliUrl(url);
  const normalizedUrl = resolvedUrl.toString();
  const bvid = extractBilibiliBvid(resolvedUrl);

  if (!bvid) {
    throw new HttpError('Bilibili 链接解析失败，未识别到有效 BV 号', 400, 'BILIBILI_BVID_NOT_FOUND');
  }

  const payload = await fetchJsonWithTimeout<BilibiliViewPayload>({
    url: `https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`,
    headers: DEFAULT_HEADERS,
    errorMessage: 'Bilibili 视频信息获取失败',
    errorCode: 'BILIBILI_META_FAILED',
  });

  if (payload.code !== 0 || !payload.data) {
    throw new HttpError(
      mapBilibiliApiError(payload.code, payload.message),
      400,
      'BILIBILI_META_FAILED',
    );
  }

  const cid = Number(payload.data.cid ?? payload.data.pages?.[0]?.cid ?? 0);
  const duration = Number(payload.data.duration ?? payload.data.pages?.[0]?.duration ?? 0);

  if (!Number.isFinite(cid) || cid <= 0 || !Number.isFinite(duration) || duration <= 0) {
    throw new HttpError('Bilibili 视频信息不完整，暂时无法继续下载', 422, 'BILIBILI_META_INVALID');
  }

  return {
    platform: 'bilibili',
    normalizedUrl,
    bvid,
    cid,
    title: payload.data.title?.trim() || `Bilibili 视频 ${bvid}`,
    duration: Number(duration.toFixed(3)),
    qualities: ['1080P', '720P', '480P'],
    source: 'live',
  };
}

async function parseBilibiliMeta(url: URL): Promise<ParsedVideoLinkMeta> {
  const meta = await resolveBilibiliMeta(url);
  return {
    platform: meta.platform,
    normalizedUrl: meta.normalizedUrl,
    title: meta.title,
    duration: meta.duration,
    qualities: meta.qualities,
    source: meta.source,
  };
}

async function downloadYoutubeToTempFile(url: string, destinationPath: string) {
  try {
    const stream = ytdl(url, {
      quality: 'highest',
      filter: 'audioandvideo',
    });

    await pipeline(stream, createWriteStream(destinationPath, { flags: 'wx' }));
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim().length > 0
        ? `YouTube 视频下载失败：${error.message}`
        : 'YouTube 视频下载失败，可能是私密视频、受限视频或网络异常';
    throw new HttpError(message, 502, 'YOUTUBE_DOWNLOAD_FAILED');
  }
}

function pickBilibiliMediaUrl(payload: BilibiliPlayUrlPayload) {
  const candidates = payload.data?.durl ?? [];

  for (const item of candidates) {
    if (item.url && item.url.trim().length > 0) {
      return item.url;
    }

    const backup = item.backup_url?.find((url) => url.trim().length > 0);
    if (backup) {
      return backup;
    }
  }

  return null;
}

async function downloadBilibiliToTempFile(input: {
  bvid: string;
  cid: number;
  destinationPath: string;
}) {
  const payload = await fetchJsonWithTimeout<BilibiliPlayUrlPayload>({
    url: `https://api.bilibili.com/x/player/playurl?bvid=${encodeURIComponent(input.bvid)}&cid=${input.cid}&qn=80&fnval=0&fnver=0&fourk=1&platform=html5`,
    headers: BILIBILI_HEADERS,
    errorMessage: 'Bilibili 下载地址获取失败',
    errorCode: 'BILIBILI_DOWNLOAD_META_FAILED',
  });

  if (payload.code !== 0) {
    throw new HttpError(
      mapBilibiliApiError(payload.code, payload.message),
      400,
      'BILIBILI_DOWNLOAD_META_FAILED',
    );
  }

  const mediaUrl = pickBilibiliMediaUrl(payload);
  if (!mediaUrl) {
    throw new HttpError(
      'Bilibili 下载地址为空，可能是付费/会员专属内容或受限视频',
      400,
      'BILIBILI_DOWNLOAD_URL_MISSING',
    );
  }

  let response: Response;

  try {
    response = await fetch(mediaUrl, {
      headers: BILIBILI_HEADERS,
    });
  } catch {
    throw new HttpError('Bilibili 视频下载失败（网络异常）', 502, 'BILIBILI_DOWNLOAD_FAILED');
  }

  if (!response.ok || !response.body) {
    throw new HttpError(
      `Bilibili 视频下载失败（HTTP ${response.status}）`,
      502,
      'BILIBILI_DOWNLOAD_FAILED',
    );
  }

  try {
    const body = Readable.fromWeb(response.body as unknown as WebReadableStream);
    await pipeline(body, createWriteStream(input.destinationPath, { flags: 'wx' }));
  } catch {
    throw new HttpError('Bilibili 视频下载失败（下载流中断）', 502, 'BILIBILI_DOWNLOAD_FAILED');
  }
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
}): Promise<DownloadVideoUrlResult> {
  const normalizedUrl = normalizeInputUrl(input.url);
  const platform = detectPlatform(normalizedUrl);
  const meta: ParsedVideoLinkMeta | ResolvedBilibiliMeta =
    platform === 'youtube'
      ? await parseYoutubeMeta(normalizedUrl.toString())
      : await resolveBilibiliMeta(normalizedUrl);

  await mkdir(input.uploadDir, { recursive: true });
  const tempPath = path.join(
    input.uploadDir,
    `url_download_${Date.now()}_${Math.random().toString(16).slice(2, 10)}.mp4`,
  );

  try {
    if (platform === 'youtube') {
      await downloadYoutubeToTempFile(meta.normalizedUrl, tempPath);
    } else {
      const bilibiliMeta = meta as ResolvedBilibiliMeta;
      await downloadBilibiliToTempFile({
        bvid: bilibiliMeta.bvid,
        cid: bilibiliMeta.cid,
        destinationPath: tempPath,
      });
    }

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
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError('链接视频下载失败，请稍后重试', 502, 'URL_DOWNLOAD_FAILED');
  } finally {
    await rm(tempPath, { force: true });
  }
}
