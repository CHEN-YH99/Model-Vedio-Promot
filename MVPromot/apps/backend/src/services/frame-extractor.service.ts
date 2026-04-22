import path from 'node:path';
import { execFile } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { promisify } from 'node:util';

import { env } from '../config/env.js';
import { HttpError } from '../utils/http-error.js';
import type { ExtractedFrame, SampleDensity } from '../types/analysis.js';

const execFileAsync = promisify(execFile);

const SAMPLE_INTERVAL: Record<SampleDensity, number> = {
  low: 10,
  medium: 5,
  high: 2,
};

const SCENE_THRESHOLD: Record<SampleDensity, number> = {
  low: 0.45,
  medium: 0.35,
  high: 0.25,
};

const MIN_SCENE_GAP_SECONDS: Record<SampleDensity, number> = {
  low: 3,
  medium: 1.5,
  high: 0.75,
};

const FFMPEG_MAX_BUFFER_BYTES = 8 * 1024 * 1024;

interface TimestampCandidate {
  key: number;
  timestamp: number;
  priority: 1 | 2 | 3;
}

function toTimestampKey(timestamp: number) {
  return Math.round(timestamp * 1000);
}

function normalizeTimestamp(timestamp: number, duration: number) {
  const clampedTimestamp = Math.min(Math.max(timestamp, 0), Math.max(duration, 0));
  return Number(clampedTimestamp.toFixed(3));
}

function createSafeTailTimestamp(duration: number) {
  const safeTailTimestamp = Math.max(0, duration - 0.05);

  if (safeTailTimestamp <= 0.5) {
    return null;
  }

  return Number(safeTailTimestamp.toFixed(3));
}

function pickCoverageCandidates(
  candidates: TimestampCandidate[],
  count: number,
  selectedCandidates: TimestampCandidate[],
) {
  if (count <= 0 || candidates.length === 0) {
    return [];
  }

  const selected = [...selectedCandidates];
  const picked: TimestampCandidate[] = [];
  const selectedKeys = new Set(selected.map((candidate) => candidate.key));

  while (picked.length < count) {
    let bestCandidate: TimestampCandidate | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const candidate of candidates) {
      if (selectedKeys.has(candidate.key)) {
        continue;
      }

      const distanceToNearestSelected = selected.reduce((minimumDistance, selectedCandidate) => {
        return Math.min(minimumDistance, Math.abs(candidate.timestamp - selectedCandidate.timestamp));
      }, Number.POSITIVE_INFINITY);
      const score = distanceToNearestSelected + candidate.priority / 1000;

      if (
        score > bestScore ||
        (score === bestScore && (bestCandidate === null || candidate.timestamp < bestCandidate.timestamp))
      ) {
        bestCandidate = candidate;
        bestScore = score;
      }
    }

    if (!bestCandidate) {
      break;
    }

    picked.push(bestCandidate);
    selected.push(bestCandidate);
    selectedKeys.add(bestCandidate.key);
  }

  return picked;
}

function reduceTimestampCandidates(candidates: TimestampCandidate[], maxFrames: number) {
  if (candidates.length <= maxFrames) {
    return candidates.map((candidate) => candidate.timestamp);
  }

  const anchors: TimestampCandidate[] = [];
  const firstCandidate = candidates[0];
  const lastCandidate = candidates[candidates.length - 1];

  if (firstCandidate) {
    anchors.push(firstCandidate);
  }

  if (lastCandidate && lastCandidate.key !== firstCandidate?.key) {
    anchors.push(lastCandidate);
  }

  if (anchors.length >= maxFrames) {
    return anchors
      .slice(0, maxFrames)
      .map((candidate) => candidate.timestamp)
      .sort((left, right) => left - right);
  }

  const selectedKeys = new Set(anchors.map((candidate) => candidate.key));
  const middleCandidates = candidates.filter((candidate) => !selectedKeys.has(candidate.key));
  const sceneCandidates = middleCandidates.filter((candidate) => candidate.priority >= 2);

  const pickedScenes = pickCoverageCandidates(sceneCandidates, maxFrames - anchors.length, anchors);

  for (const candidate of pickedScenes) {
    selectedKeys.add(candidate.key);
  }

  const fillerCandidates = candidates.filter((candidate) => !selectedKeys.has(candidate.key));
  const pickedFillers = pickCoverageCandidates(
    fillerCandidates,
    maxFrames - anchors.length - pickedScenes.length,
    [...anchors, ...pickedScenes],
  );

  return [...anchors, ...pickedScenes, ...pickedFillers]
    .sort((left, right) => left.timestamp - right.timestamp)
    .map((candidate) => candidate.timestamp);
}

export function calculateSampleTimestamps(input: {
  duration: number;
  sampleDensity: SampleDensity;
  maxFrames?: number;
}): number[] {
  const maxFrames = input.maxFrames ?? env.ANALYSIS_MAX_FRAMES;
  const interval = SAMPLE_INTERVAL[input.sampleDensity];

  const timestamps: number[] = [0];

  for (let current = interval; current < input.duration; current += interval) {
    timestamps.push(Number(current.toFixed(3)));
  }

  const safeTailTimestamp = createSafeTailTimestamp(input.duration);

  if (safeTailTimestamp !== null) {
    timestamps.push(safeTailTimestamp);
  }

  const deduped = Array.from(new Set(timestamps)).sort((a, b) => a - b);

  if (deduped.length <= maxFrames) {
    return deduped;
  }

  const reducedCandidates = deduped.map<TimestampCandidate>((timestamp, index) => ({
    key: toTimestampKey(timestamp),
    timestamp,
    priority: index === 0 || index === deduped.length - 1 ? 3 : 1,
  }));

  return reduceTimestampCandidates(reducedCandidates, maxFrames);
}

export async function detectSceneChangeTimestamps(input: {
  sourcePath: string;
  duration: number;
  sampleDensity: SampleDensity;
}): Promise<number[]> {
  const threshold = SCENE_THRESHOLD[input.sampleDensity];
  const minimumGap = MIN_SCENE_GAP_SECONDS[input.sampleDensity];

  try {
    const { stderr } = await execFileAsync(
      'ffmpeg',
      [
        '-hide_banner',
        '-i',
        input.sourcePath,
        '-vf',
        `select=gt(scene\\,${threshold}),showinfo`,
        '-an',
        '-f',
        'null',
        '-',
      ],
      {
        maxBuffer: FFMPEG_MAX_BUFFER_BYTES,
      },
    );

    const timestamps: number[] = [];
    const matches = stderr.matchAll(/pts_time:(\d+(?:\.\d+)?)/g);

    for (const match of matches) {
      const rawTimestamp = Number(match[1]);

      if (!Number.isFinite(rawTimestamp)) {
        continue;
      }

      const normalizedTimestamp = normalizeTimestamp(rawTimestamp, input.duration);
      const previousTimestamp = timestamps[timestamps.length - 1];

      if (normalizedTimestamp < 0.2) {
        continue;
      }

      if (previousTimestamp !== undefined && normalizedTimestamp - previousTimestamp < minimumGap) {
        continue;
      }

      timestamps.push(normalizedTimestamp);
    }

    return timestamps;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ffmpeg scene detection failed';
    throw new Error(`场景切换检测失败: ${message}`);
  }
}

export function mergeFrameTimestamps(input: {
  duration: number;
  maxFrames?: number;
  uniformTimestamps: number[];
  sceneTimestamps: number[];
}) {
  const maxFrames = input.maxFrames ?? env.ANALYSIS_MAX_FRAMES;
  const candidateMap = new Map<number, TimestampCandidate>();
  const tailTimestamp = createSafeTailTimestamp(input.duration);

  const registerTimestamp = (timestamp: number, priority: 1 | 2 | 3) => {
    const normalizedTimestamp = normalizeTimestamp(timestamp, input.duration);
    const key = toTimestampKey(normalizedTimestamp);
    const existing = candidateMap.get(key);

    if (!existing || priority > existing.priority) {
      candidateMap.set(key, {
        key,
        timestamp: normalizedTimestamp,
        priority,
      });
    }
  };

  registerTimestamp(0, 3);

  if (tailTimestamp !== null) {
    registerTimestamp(tailTimestamp, 3);
  }

  for (const timestamp of input.uniformTimestamps) {
    registerTimestamp(timestamp, 1);
  }

  for (const timestamp of input.sceneTimestamps) {
    registerTimestamp(timestamp, 2);
  }

  const candidates = Array.from(candidateMap.values()).sort((left, right) => left.timestamp - right.timestamp);

  return reduceTimestampCandidates(candidates, maxFrames);
}

export async function collectFrameTimestamps(input: {
  sourcePath: string;
  duration: number;
  sampleDensity: SampleDensity;
  maxFrames?: number;
  onSceneDetectionFallback?: (message: string) => void;
}) {
  const uniformTimestamps = calculateSampleTimestamps({
    duration: input.duration,
    sampleDensity: input.sampleDensity,
    maxFrames: input.maxFrames,
  });

  try {
    const sceneTimestamps = await detectSceneChangeTimestamps({
      sourcePath: input.sourcePath,
      duration: input.duration,
      sampleDensity: input.sampleDensity,
    });

    return mergeFrameTimestamps({
      duration: input.duration,
      maxFrames: input.maxFrames,
      uniformTimestamps,
      sceneTimestamps,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '场景切换检测失败';
    input.onSceneDetectionFallback?.(message);
    return uniformTimestamps;
  }
}

export async function extractFrames(input: {
  sourcePath: string;
  analysisId: string;
  timestamps: number[];
  uploadDir: string;
  onProgress?: (completed: number, total: number) => Promise<void> | void;
}): Promise<ExtractedFrame[]> {
  const outputDir = path.join(input.uploadDir, 'frames', input.analysisId);
  await mkdir(outputDir, { recursive: true });

  const frames: ExtractedFrame[] = [];

  for (let index = 0; index < input.timestamps.length; index += 1) {
    const timestamp = input.timestamps[index];

    if (timestamp === undefined) {
      continue;
    }

    const fileName = `frame_${String(index + 1).padStart(4, '0')}.jpg`;
    const absolutePath = path.join(outputDir, fileName);

    try {
      await execFileAsync('ffmpeg', [
        '-y',
        '-ss',
        timestamp.toFixed(3),
        '-i',
        input.sourcePath,
        '-frames:v',
        '1',
        '-q:v',
        '2',
        absolutePath,
      ]);
    } catch {
      continue;
    }

    frames.push({
      timestamp,
      fileName,
      absolutePath,
      thumbUrl: `/uploads/frames/${input.analysisId}/${fileName}`,
    });

    if (input.onProgress) {
      await input.onProgress(index + 1, input.timestamps.length);
    }
  }

  if (frames.length === 0) {
    throw new HttpError('关键帧提取失败，未生成可用帧', 500, 'FRAME_EXTRACT_FAILED');
  }

  return frames;
}
