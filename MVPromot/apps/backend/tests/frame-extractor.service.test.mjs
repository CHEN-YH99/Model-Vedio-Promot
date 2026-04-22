import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5432/video_prompt';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-12345678901234567890';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-1234567890123456789';

const { calculateSampleTimestamps, mergeFrameTimestamps } = await import(
  '../dist/services/frame-extractor.service.js'
);

test('calculateSampleTimestamps includes the first frame and safe tail frame', () => {
  const timestamps = calculateSampleTimestamps({
    duration: 12.4,
    sampleDensity: 'medium',
    maxFrames: 20,
  });

  assert.deepEqual(timestamps, [0, 5, 10, 12.35]);
});

test('calculateSampleTimestamps reduces samples when maxFrames is smaller than timeline coverage', () => {
  const timestamps = calculateSampleTimestamps({
    duration: 25,
    sampleDensity: 'high',
    maxFrames: 5,
  });

  assert.equal(timestamps[0], 0);
  assert.equal(timestamps.at(-1), 24.95);
  assert.equal(timestamps.length, 5);
});

test('mergeFrameTimestamps prioritizes scene cuts while preserving first and last keyframes', () => {
  const timestamps = mergeFrameTimestamps({
    duration: 40,
    maxFrames: 6,
    uniformTimestamps: [0, 10, 20, 30, 39.95],
    sceneTimestamps: [3.2, 11.7, 19.4, 27.8, 35.6],
  });

  assert.deepEqual(timestamps, [0, 11.7, 19.4, 27.8, 35.6, 39.95]);
});

test('mergeFrameTimestamps backfills with uniform samples when scene cuts are sparse', () => {
  const timestamps = mergeFrameTimestamps({
    duration: 40,
    maxFrames: 6,
    uniformTimestamps: [0, 8, 16, 24, 32, 39.95],
    sceneTimestamps: [15.8, 31.6],
  });

  assert.deepEqual(timestamps, [0, 8, 15.8, 24, 31.6, 39.95]);
});
