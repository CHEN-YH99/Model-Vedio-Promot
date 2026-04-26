import path from 'node:path';
import { createWriteStream } from 'node:fs';
import { copyFile, mkdir, open, rm, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { promisify } from 'node:util';

import type { MultipartFile } from '@fastify/multipart';
import type { Plan } from '@prisma/client';

import { prisma } from '../plugins/prisma.js';
import { HttpError } from '../utils/http-error.js';

const execFileAsync = promisify(execFile);

const ALLOWED_EXTENSIONS = new Set(['mp4', 'mov', 'avi', 'webm']);
const ALLOWED_MIME_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
]);

const FREE_MAX_BYTES = 100 * 1024 * 1024;
const PRO_MAX_BYTES = 500 * 1024 * 1024;
const MAGIC_BUFFER_SIZE = 16;

interface VideoMetaResult {
  duration: number;
  resolution: string;
  fps: number;
  codec: string;
}

interface CreateUploadedFileRecordInput {
  userId: string;
  fileId: string;
  storedFilename: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  destinationPath: string;
  meta: VideoMetaResult;
}

function getMaxUploadBytes(plan: Plan): number {
  if (plan === 'FREE') {
    return FREE_MAX_BYTES;
  }

  return PRO_MAX_BYTES;
}

function parseExtension(filename: string | undefined): string {
  if (!filename) {
    return '';
  }

  return path.extname(filename).replace('.', '').toLowerCase();
}

function ensureVideoFileSupported(filename: string | undefined, mimetype: string): string {
  const extension = parseExtension(filename);
  const normalizedMime = mimetype.toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(extension) && !ALLOWED_MIME_TYPES.has(normalizedMime)) {
    throw new HttpError('不支持的文件格式，仅支持 MP4/MOV/AVI/WebM', 400, 'UNSUPPORTED_FILE_TYPE');
  }

  return extension;
}

function parseFrameRate(value: string | undefined): number {
  if (!value) {
    return 0;
  }

  if (!value.includes('/')) {
    const direct = Number(value);
    return Number.isFinite(direct) ? direct : 0;
  }

  const [numeratorRaw, denominatorRaw] = value.split('/');
  const numerator = Number(numeratorRaw);
  const denominator = Number(denominatorRaw);

  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return 0;
  }

  return Number((numerator / denominator).toFixed(3));
}

function readAscii(buffer: Buffer, start: number, end: number) {
  return buffer.subarray(start, end).toString('ascii');
}

function detectVideoSignature(buffer: Buffer) {
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return 'webm';
  }

  if (
    buffer.length >= 12 &&
    readAscii(buffer, 0, 4) === 'RIFF' &&
    readAscii(buffer, 8, 12) === 'AVI '
  ) {
    return 'avi';
  }

  if (buffer.length >= 8 && readAscii(buffer, 4, 8) === 'ftyp') {
    return 'mp4';
  }

  return null;
}

function isExtensionCompatibleWithSignature(extension: string, signature: string | null) {
  if (!signature) {
    return false;
  }

  if (!extension) {
    return true;
  }

  if (extension === 'mov') {
    return signature === 'mp4';
  }

  return extension === signature;
}

async function ensureVideoMagicNumber(input: { destinationPath: string; extension: string }) {
  const handle = await open(input.destinationPath, 'r');

  try {
    const buffer = Buffer.allocUnsafe(MAGIC_BUFFER_SIZE);
    const { bytesRead } = await handle.read(buffer, 0, MAGIC_BUFFER_SIZE, 0);
    const headBytes = buffer.subarray(0, bytesRead);
    const signature = detectVideoSignature(headBytes);

    if (!isExtensionCompatibleWithSignature(input.extension, signature)) {
      throw new HttpError('文件内容与视频格式不匹配，请勿伪造扩展名', 400, 'FILE_SIGNATURE_INVALID');
    }
  } finally {
    await handle.close();
  }
}

async function persistUploadFile(part: MultipartFile, destinationPath: string, maxBytes: number) {
  let size = 0;

  const byteLimitTransform = new Transform({
    transform(chunk, _encoding, callback) {
      size += chunk.length;

      if (size > maxBytes) {
        callback(
          new HttpError(
            `文件大小超过限制，最大允许 ${Math.floor(maxBytes / 1024 / 1024)}MB`,
            413,
            'FILE_TOO_LARGE',
          ),
        );
        return;
      }

      callback(null, chunk);
    },
  });

  try {
    await pipeline(
      part.file,
      byteLimitTransform,
      createWriteStream(destinationPath, { flags: 'wx' }),
    );

    if (part.file.truncated) {
      await rm(destinationPath, { force: true });
      throw new HttpError('文件大小超过 500MB 上限', 413, 'FILE_TOO_LARGE');
    }

    const fileInfo = await stat(destinationPath);

    if (fileInfo.size > maxBytes) {
      await rm(destinationPath, { force: true });
      throw new HttpError(
        `文件大小超过限制，最大允许 ${Math.floor(maxBytes / 1024 / 1024)}MB`,
        413,
        'FILE_TOO_LARGE',
      );
    }

    return fileInfo.size;
  } catch (error) {
    await rm(destinationPath, { force: true });

    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError('上传文件保存失败', 500, 'UPLOAD_SAVE_FAILED');
  }
}

async function extractVideoMetadata(filePath: string): Promise<VideoMetaResult> {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v',
      'error',
      '-show_format',
      '-show_streams',
      '-print_format',
      'json',
      filePath,
    ]);

    const probe = JSON.parse(stdout) as {
      streams?: Array<{
        codec_type?: string;
        codec_name?: string;
        width?: number;
        height?: number;
        r_frame_rate?: string;
        avg_frame_rate?: string;
        duration?: string;
      }>;
      format?: {
        duration?: string;
      };
    };

    const videoStream = probe.streams?.find((stream) => stream.codec_type === 'video');

    if (!videoStream) {
      throw new HttpError('无法识别视频流', 422, 'VIDEO_STREAM_NOT_FOUND');
    }

    const duration = Number(probe.format?.duration ?? videoStream.duration ?? 0);
    const width = videoStream.width ?? 0;
    const height = videoStream.height ?? 0;
    const fps = parseFrameRate(videoStream.avg_frame_rate ?? videoStream.r_frame_rate);
    const codec = videoStream.codec_name ?? 'unknown';

    if (!Number.isFinite(duration) || duration <= 0 || width <= 0 || height <= 0) {
      throw new HttpError('视频元数据不完整，无法继续处理', 422, 'INVALID_VIDEO_META');
    }

    return {
      duration: Number(duration.toFixed(3)),
      resolution: `${width}x${height}`,
      fps,
      codec,
    };
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError(
      'FFprobe 提取视频元数据失败，请确认文件有效且容器已安装 ffmpeg',
      500,
      'FFPROBE_FAILED',
    );
  }
}

async function getUserPlanOrThrow(userId: string): Promise<Plan> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });

  if (!user) {
    throw new HttpError('用户不存在或登录已失效', 401, 'USER_NOT_FOUND');
  }

  return user.plan;
}

async function createUploadedFileRecord(input: CreateUploadedFileRecordInput) {
  const record = await prisma.uploadedFile.create({
    data: {
      id: input.fileId,
      userId: input.userId,
      filename: input.storedFilename,
      originalName: input.originalName,
      mimeType: input.mimeType,
      size: input.fileSize,
      path: input.destinationPath,
      duration: input.meta.duration,
      resolution: input.meta.resolution,
      fps: input.meta.fps,
      codec: input.meta.codec,
    },
  });

  return {
    fileId: record.id,
    temporaryPath: record.path,
  };
}

export async function saveUploadedVideo(input: {
  userId: string;
  part: MultipartFile;
  uploadDir: string;
}) {
  const plan = await getUserPlanOrThrow(input.userId);
  const maxBytes = getMaxUploadBytes(plan);
  const extension = ensureVideoFileSupported(input.part.filename, input.part.mimetype);

  await mkdir(input.uploadDir, { recursive: true });

  const fileId = `upload_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
  const storedFilename = extension ? `${fileId}.${extension}` : fileId;
  const destinationPath = path.join(input.uploadDir, storedFilename);

  const fileSize = await persistUploadFile(input.part, destinationPath, maxBytes);
  await ensureVideoMagicNumber({
    destinationPath,
    extension,
  });

  let meta: VideoMetaResult;

  try {
    meta = await extractVideoMetadata(destinationPath);
  } catch (error) {
    await rm(destinationPath, { force: true });
    throw error;
  }

  return createUploadedFileRecord({
    userId: input.userId,
    fileId,
    storedFilename,
    originalName: input.part.filename ?? storedFilename,
    mimeType: input.part.mimetype,
    fileSize,
    destinationPath,
    meta,
  });
}

export async function saveUploadedVideoFromLocalPath(input: {
  userId: string;
  sourcePath: string;
  uploadDir: string;
  originalName: string;
  mimeType?: string;
}) {
  const plan = await getUserPlanOrThrow(input.userId);
  const maxBytes = getMaxUploadBytes(plan);
  const extension = parseExtension(input.originalName) || 'mp4';
  const mimeType = input.mimeType ?? 'video/mp4';

  ensureVideoFileSupported(input.originalName, mimeType);

  await mkdir(input.uploadDir, { recursive: true });

  const fileId = `upload_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
  const storedFilename = `${fileId}.${extension}`;
  const destinationPath = path.join(input.uploadDir, storedFilename);

  try {
    await copyFile(input.sourcePath, destinationPath);
  } catch {
    throw new HttpError('链接视频保存失败', 500, 'UPLOAD_SAVE_FAILED');
  }

  const fileInfo = await stat(destinationPath);
  if (fileInfo.size > maxBytes) {
    await rm(destinationPath, { force: true });
    throw new HttpError(
      `文件大小超过限制，最大允许 ${Math.floor(maxBytes / 1024 / 1024)}MB`,
      413,
      'FILE_TOO_LARGE',
    );
  }

  await ensureVideoMagicNumber({
    destinationPath,
    extension,
  });

  let meta: VideoMetaResult;

  try {
    meta = await extractVideoMetadata(destinationPath);
  } catch (error) {
    await rm(destinationPath, { force: true });
    throw error;
  }

  return createUploadedFileRecord({
    userId: input.userId,
    fileId,
    storedFilename,
    originalName: input.originalName,
    mimeType,
    fileSize: fileInfo.size,
    destinationPath,
    meta,
  });
}

export async function getUploadedVideoMeta(input: { fileId: string; userId: string }) {
  const record = await prisma.uploadedFile.findFirst({
    where: {
      id: input.fileId,
      userId: input.userId,
    },
  });

  if (!record) {
    throw new HttpError('未找到对应上传文件', 404, 'UPLOAD_FILE_NOT_FOUND');
  }

  return {
    fileId: record.id,
    filename: record.originalName,
    duration: record.duration ?? 0,
    resolution: record.resolution ?? 'unknown',
    fps: record.fps ?? 0,
    codec: record.codec ?? 'unknown',
    size: record.size,
    uploadedAt: record.uploadedAt.toISOString(),
  };
}
