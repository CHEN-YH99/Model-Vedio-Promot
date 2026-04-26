import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5432/video_prompt';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-12345678901234567890';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-1234567890123456789';

const {
  generateOverallPromptByPlatform,
  generatePromptByPlatform,
  normalizePlatforms,
  supportsNegativePrompt,
} = await import('../dist/services/analysis-prompt.service.js');

const frameAnalysis = {
  subject: 'young skateboarder',
  scene: 'sunset urban overpass',
  colorTone: 'warm orange and cyan',
  lighting: 'golden hour rim light',
  style: 'cinematic realism',
  mood: 'energetic and hopeful',
  cameraAngle: 'low angle medium shot',
  cameraMovement: 'smooth tracking shot',
};

test('generatePromptByPlatform returns multilingual prompt and negative prompt for wan', () => {
  const prompt = generatePromptByPlatform({
    platform: 'wan',
    analysis: frameAnalysis,
  });

  assert.equal(typeof prompt.prompt.zh, 'string');
  assert.equal(typeof prompt.prompt.en, 'string');
  assert.equal(typeof prompt.prompt.bilingual, 'string');
  assert.match(prompt.prompt.bilingual, /中文：/);
  assert.match(prompt.prompt.bilingual, /English:/);

  assert.ok(prompt.negativePrompt);
  assert.match(prompt.negativePrompt.zh, /低清晰度|模糊/);
  assert.match(prompt.negativePrompt.en, /low resolution|blur/);
});

test('generatePromptByPlatform omits negative prompt for sora and enables it on kling/pika/hailuo', () => {
  const prompt = generatePromptByPlatform({
    platform: 'sora',
    analysis: frameAnalysis,
  });

  assert.equal(prompt.negativePrompt, undefined);
  assert.equal(supportsNegativePrompt('sora'), false);
  assert.equal(supportsNegativePrompt('kling'), true);
  assert.equal(supportsNegativePrompt('pika'), true);
  assert.equal(supportsNegativePrompt('hailuo'), true);
});

test('generateOverallPromptByPlatform returns requested platforms with multilingual payload', () => {
  const overall = generateOverallPromptByPlatform({
    frames: [frameAnalysis, frameAnalysis],
    platforms: ['runway', 'wan'],
  });

  assert.equal(Object.keys(overall).length, 2);
  assert.ok(overall.runway);
  assert.ok(overall.wan);

  assert.match(overall.runway.prompt.en, /multi-shot|sequence/i);
  assert.equal(overall.runway.negativePrompt, undefined);
  assert.ok(overall.wan.negativePrompt);
  assert.match(overall.wan.prompt.bilingual, /中文：/);
});

test('normalizePlatforms keeps supported unique platforms and falls back when invalid', () => {
  assert.deepEqual(normalizePlatforms(['SORA', 'wan', 'wan', 'abc']), ['sora', 'wan']);
  assert.deepEqual(normalizePlatforms(['abc']), ['sora', 'runway']);
  assert.deepEqual(normalizePlatforms(undefined), ['sora', 'runway']);
});
