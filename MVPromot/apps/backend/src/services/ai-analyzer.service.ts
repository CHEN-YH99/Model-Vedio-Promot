import path from 'node:path';
import { readFile } from 'node:fs/promises';

import { z } from 'zod';

import { env } from '../config/env.js';
import type { FrameAnalysis, PromptLanguage } from '../types/analysis.js';
import { HttpError } from '../utils/http-error.js';

const OUTPUT_FORMAT_NAME = 'frame_analysis';
const FRAME_ANALYSIS_CONTRACT = {
  subject: 'Main visible subject in a short production-ready English phrase.',
  scene: 'Scene and environment in a short English phrase.',
  colorTone: 'Color palette or tone in a short English phrase.',
  lighting: 'Lighting setup or quality in a short English phrase.',
  style: 'Visual style in a short English phrase.',
  mood: 'Mood or atmosphere in a short English phrase.',
  cameraAngle: 'Shot type or camera angle in a short English phrase.',
  cameraMovement:
    'Camera movement in a short English phrase. Use "locked camera" when motion cannot be inferred.',
} as const;

const frameAnalysisSchema = z.object({
  subject: z.string().trim().min(1),
  scene: z.string().trim().min(1),
  colorTone: z.string().trim().min(1),
  lighting: z.string().trim().min(1),
  style: z.string().trim().min(1),
  mood: z.string().trim().min(1),
  cameraAngle: z.string().trim().min(1),
  cameraMovement: z.string().trim().min(1),
});

const frameAnalysisJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    subject: {
      type: 'string',
      description: 'Main visible subject in a short production-ready phrase.',
    },
    scene: {
      type: 'string',
      description: 'Scene and environment in a short phrase.',
    },
    colorTone: {
      type: 'string',
      description: 'Color palette or tone in a short phrase.',
    },
    lighting: {
      type: 'string',
      description: 'Lighting setup or quality in a short phrase.',
    },
    style: {
      type: 'string',
      description: 'Visual style in a short phrase.',
    },
    mood: {
      type: 'string',
      description: 'Mood or atmosphere in a short phrase.',
    },
    cameraAngle: {
      type: 'string',
      description: 'Shot type or camera angle in a short phrase.',
    },
    cameraMovement: {
      type: 'string',
      description: 'Camera movement in a short phrase. Use "locked camera" when static.',
    },
  },
  required: [
    'subject',
    'scene',
    'colorTone',
    'lighting',
    'style',
    'mood',
    'cameraAngle',
    'cameraMovement',
  ],
} as const;
const FRAME_ANALYSIS_KEYS = [
  'subject',
  'scene',
  'colorTone',
  'lighting',
  'style',
  'mood',
  'cameraAngle',
  'cameraMovement',
] as const satisfies ReadonlyArray<keyof FrameAnalysis>;

const FRAME_ANALYSIS_KEY_ALIASES: Record<keyof FrameAnalysis, string[]> = {
  subject: ['subject', 'mainSubject', 'main_subject', 'object', '主体', '主体描述'],
  scene: ['scene', 'environment', 'background', '场景', '场景描述', '环境'],
  colorTone: ['colorTone', 'color_tone', 'color', 'palette', 'tone', '色调', '颜色', '色彩'],
  lighting: ['lighting', 'light', 'illumination', '光线', '打光', '光照'],
  style: ['style', 'visualStyle', 'visual_style', '画面风格', '风格'],
  mood: ['mood', 'atmosphere', 'emotion', '情绪', '氛围'],
  cameraAngle: ['cameraAngle', 'camera_angle', 'shotType', 'shot_type', 'angle', '景别', '镜头角度'],
  cameraMovement: [
    'cameraMovement',
    'camera_movement',
    'cameraMotion',
    'camera_motion',
    'movement',
    '运镜',
    '镜头运动',
  ],
};

const FRAME_ANALYSIS_FALLBACKS: FrameAnalysis = {
  subject: 'unspecified subject',
  scene: 'unspecified scene',
  colorTone: 'neutral color tone',
  lighting: 'natural lighting',
  style: 'cinematic style',
  mood: 'neutral mood',
  cameraAngle: 'medium shot',
  cameraMovement: 'locked camera',
};

const SUBJECT_POOL = [
  'a young protagonist',
  'an urban traveler',
  'a lone performer',
  'a small team',
  'a cinematic object',
];
const SCENE_POOL = [
  'modern city street',
  'indoor studio environment',
  'wide natural landscape',
  'industrial interior',
  'nighttime neon district',
];
const COLOR_POOL = [
  'warm cinematic contrast',
  'cool blue tone',
  'high saturation palette',
  'muted film grain',
];
const LIGHT_POOL = [
  'soft side lighting',
  'dramatic backlight',
  'natural diffuse daylight',
  'high-contrast spotlight',
];
const STYLE_POOL = [
  'cinematic realism',
  'documentary texture',
  'stylized commercial look',
  'film-like composition',
];
const MOOD_POOL = [
  'calm and focused',
  'tense and suspenseful',
  'dreamy and poetic',
  'energetic and uplifting',
];
const ANGLE_POOL = ['medium shot', 'wide shot', 'close-up', 'high angle'];
const MOVEMENT_POOL = [
  'slow push-in',
  'steady tracking shot',
  'handheld subtle motion',
  'locked camera',
];

type OpenAIResponsesApiResult = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
      refusal?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

type OpenAIChatCompletionsApiResult = {
  choices?: Array<{
    message?: {
      content?:
        | string
        | Array<{
            type?: string;
            text?: string;
          }>;
      reasoning_content?:
        | string
        | Array<{
            type?: string;
            text?: string;
          }>;
      refusal?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

function pick<T>(items: T[], seed: number): T {
  const value = items[seed % items.length];

  if (value === undefined) {
    return items[0] as T;
  }

  return value;
}

function mockAnalysis(timestamp: number): FrameAnalysis {
  const seed = Math.max(1, Math.floor(timestamp * 1000));

  return {
    subject: pick(SUBJECT_POOL, seed + 1),
    scene: pick(SCENE_POOL, seed + 2),
    colorTone: pick(COLOR_POOL, seed + 3),
    lighting: pick(LIGHT_POOL, seed + 4),
    style: pick(STYLE_POOL, seed + 5),
    mood: pick(MOOD_POOL, seed + 6),
    cameraAngle: pick(ANGLE_POOL, seed + 7),
    cameraMovement: pick(MOVEMENT_POOL, seed + 8),
  };
}

function getImageMimeType(imagePath: string) {
  const extension = path.extname(imagePath).toLowerCase();

  if (extension === '.png') {
    return 'image/png';
  }

  if (extension === '.webp') {
    return 'image/webp';
  }

  return 'image/jpeg';
}

async function encodeImageAsDataUrl(imagePath: string) {
  try {
    const imageBuffer = await readFile(imagePath);
    return `data:${getImageMimeType(imagePath)};base64,${imageBuffer.toString('base64')}`;
  } catch {
    throw new HttpError('关键帧读取失败，无法提交 AI 分析', 500, 'FRAME_READ_FAILED');
  }
}

function buildOpenAIApiUrl(endpoint: 'responses' | 'chat/completions') {
  const trimmed = env.OPENAI_BASE_URL.replace(/\/+$/, '');
  const hasVersionSegment = /\/v\d+$/.test(trimmed);
  const root = hasVersionSegment ? trimmed : `${trimmed}/v1`;
  return `${root}/${endpoint}`;
}

function buildAnalysisInstruction(input: {
  timestamp: number;
  language: PromptLanguage;
  strictSpecificity?: boolean;
}) {
  const languageNote =
    input.language === 'zh'
      ? 'The downstream prompt output will be Chinese.'
      : input.language === 'bilingual'
        ? 'The downstream prompt output will be bilingual.'
        : 'The downstream prompt output will be English.';
  const specificityNote = input.strictSpecificity
    ? [
        'Prioritize image-grounded details over generic wording.',
        'Each field must include concrete visual cues seen in the frame.',
        'Do not output placeholders such as "unspecified", "generic", or "unknown".',
        'Do not invent entities not visible in the frame.',
      ].join(' ')
    : 'Prefer concrete, image-grounded phrasing over abstract wording.';

  return [
    'You are analyzing a single keyframe from a source video for prompt generation.',
    'Return valid JSON only. Do not wrap the JSON in markdown or code fences.',
    'Return exactly these keys and no extra keys:',
    JSON.stringify(FRAME_ANALYSIS_CONTRACT),
    'All field values must be short English phrases so downstream prompt templates can localize them.',
    'Infer camera movement conservatively. If motion cannot be inferred from one frame, use "locked camera".',
    'Avoid generic filler like "beautiful" or "nice".',
    specificityNote,
    languageNote,
    `Frame timestamp: ${input.timestamp.toFixed(3)} seconds.`,
  ].join(' ');
}

function shouldUseJsonObjectResponseFormat() {
  return /bigmodel\.cn/i.test(env.OPENAI_BASE_URL) || env.OPENAI_MODEL.toLowerCase().startsWith('glm-');
}

function shouldDisableThinkingMode() {
  return /bigmodel\.cn/i.test(env.OPENAI_BASE_URL) || env.OPENAI_MODEL.toLowerCase().startsWith('glm-');
}

function getChatCompletionMaxTokens(attempt: number) {
  return 1200 + attempt * 400;
}

function getResponsesMaxOutputTokens() {
  return 1200;
}

function extractResponsesText(payload: OpenAIResponsesApiResult) {
  if (typeof payload.output_text === 'string' && payload.output_text.trim().length > 0) {
    return payload.output_text.trim();
  }

  for (const block of payload.output ?? []) {
    for (const item of block.content ?? []) {
      if (item.type === 'output_text' && typeof item.text === 'string' && item.text.trim().length > 0) {
        return item.text.trim();
      }
    }
  }

  return null;
}

function extractChatCompletionText(payload: OpenAIChatCompletionsApiResult) {
  const message = payload.choices?.[0]?.message;

  if (!message) {
    return null;
  }

  if (typeof message.content === 'string' && message.content.trim().length > 0) {
    return message.content.trim();
  }

  if (Array.isArray(message.content)) {
    for (const item of message.content) {
      if (typeof item.text === 'string' && item.text.trim().length > 0) {
        return item.text.trim();
      }
    }
  }

  if (typeof message.reasoning_content === 'string' && message.reasoning_content.trim().length > 0) {
    return message.reasoning_content.trim();
  }

  if (Array.isArray(message.reasoning_content)) {
    for (const item of message.reasoning_content) {
      if (typeof item.text === 'string' && item.text.trim().length > 0) {
        return item.text.trim();
      }
    }
  }

  return null;
}

async function parseOpenAIError(response: Response) {
  const fallbackMessage = `AI 接口请求失败（HTTP ${response.status}）`;

  try {
    const payload = (await response.json()) as OpenAIResponsesApiResult;
    return payload.error?.message?.trim() || fallbackMessage;
  } catch {
    try {
      const text = await response.text();
      return text.trim() || fallbackMessage;
    } catch {
      return fallbackMessage;
    }
  }
}

function extractJsonPayload(content: string): string {
  const answerMatch = content.match(/<answer>([\s\S]*)$/i);
  const trimmed = (answerMatch?.[1] ?? content)
    .replace(/<\/?think>/gi, '')
    .replace(/<\/?answer>/gi, '')
    .trim();

  const codeBlockMatch = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (codeBlockMatch?.[1]) {
    return codeBlockMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function finalizePartialFrameAnalysis(
  partial: Partial<FrameAnalysis>,
  minimumFields: number,
): FrameAnalysis | null {
  let score = 0;

  for (const key of FRAME_ANALYSIS_KEYS) {
    if (typeof partial[key] === 'string' && partial[key]?.trim()) {
      score += 1;
    }
  }

  if (score < minimumFields) {
    return null;
  }

  return {
    subject: partial.subject ?? FRAME_ANALYSIS_FALLBACKS.subject,
    scene: partial.scene ?? FRAME_ANALYSIS_FALLBACKS.scene,
    colorTone: partial.colorTone ?? FRAME_ANALYSIS_FALLBACKS.colorTone,
    lighting: partial.lighting ?? FRAME_ANALYSIS_FALLBACKS.lighting,
    style: partial.style ?? FRAME_ANALYSIS_FALLBACKS.style,
    mood: partial.mood ?? FRAME_ANALYSIS_FALLBACKS.mood,
    cameraAngle: partial.cameraAngle ?? FRAME_ANALYSIS_FALLBACKS.cameraAngle,
    cameraMovement: partial.cameraMovement ?? FRAME_ANALYSIS_FALLBACKS.cameraMovement,
  };
}

function normalizeKey(input: string) {
  return input.toLowerCase().replace(/[\s_-]+/g, '');
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return null;
  }

  return value as Record<string, unknown>;
}

function coerceTextValue(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    const items = value
      .map((item) => coerceTextValue(item))
      .filter((item): item is string => Boolean(item));

    return items.length > 0 ? items.join(', ') : null;
  }

  const record = toRecord(value);
  if (!record) {
    return null;
  }

  for (const key of ['text', 'value', 'content', 'desc', 'description']) {
    if (key in record) {
      const text = coerceTextValue(record[key]);
      if (text) {
        return text;
      }
    }
  }

  try {
    const serialized = JSON.stringify(record);
    return serialized && serialized !== '{}' ? serialized.slice(0, 200) : null;
  } catch {
    return null;
  }
}

function collectObjectCandidates(rawPayload: unknown): Record<string, unknown>[] {
  const queue: unknown[] = [rawPayload];
  const visited = new Set<unknown>();
  const candidates: Record<string, unknown>[] = [];

  while (queue.length > 0 && candidates.length < 20) {
    const current = queue.shift();

    if (!current || typeof current !== 'object' || visited.has(current)) {
      continue;
    }

    visited.add(current);

    if (Array.isArray(current)) {
      for (const item of current.slice(0, 8)) {
        queue.push(item);
      }
      continue;
    }

    const record = current as Record<string, unknown>;
    candidates.push(record);

    for (const value of Object.values(record)) {
      if (value && typeof value === 'object') {
        queue.push(value);
      }
    }
  }

  return candidates;
}

function resolveFieldValue(
  candidate: Record<string, unknown>,
  candidateKeyMap: Map<string, unknown>,
  aliases: string[],
) {
  for (const alias of aliases) {
    const direct = coerceTextValue(candidate[alias]);
    if (direct) {
      return direct;
    }
  }

  for (const alias of aliases) {
    const normalizedAlias = normalizeKey(alias);
    const mapped = coerceTextValue(candidateKeyMap.get(normalizedAlias));
    if (mapped) {
      return mapped;
    }
  }

  return null;
}

function normalizeFrameAnalysisPayload(rawPayload: unknown): FrameAnalysis | null {
  const candidates = collectObjectCandidates(rawPayload);
  let bestPayload: Partial<FrameAnalysis> | null = null;
  let bestScore = -1;

  for (const candidate of candidates) {
    const candidateKeyMap = new Map<string, unknown>();
    for (const [key, value] of Object.entries(candidate)) {
      candidateKeyMap.set(normalizeKey(key), value);
    }

    const partial: Partial<FrameAnalysis> = {};
    let score = 0;

    for (const key of FRAME_ANALYSIS_KEYS) {
      const value = resolveFieldValue(candidate, candidateKeyMap, FRAME_ANALYSIS_KEY_ALIASES[key]);
      if (value) {
        partial[key] = value;
        score += 1;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestPayload = partial;
    }
  }

  return bestPayload ? finalizePartialFrameAnalysis(bestPayload, 5) : null;
}

function isLowSpecificityValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (normalized.length < 4) {
    return true;
  }

  const lowSpecificityKeywords = [
    'unspecified',
    'unknown',
    'generic',
    'neutral',
    'n/a',
    'not clear',
    'not visible',
    'cinematic style',
    'main subject',
    'generic scene',
  ];

  return lowSpecificityKeywords.some((keyword) => normalized.includes(keyword));
}

function getAnalysisSpecificityScore(analysis: FrameAnalysis): number {
  return FRAME_ANALYSIS_KEYS.reduce((score, key) => {
    return isLowSpecificityValue(analysis[key]) ? score : score + 1;
  }, 0);
}

function extractJsonLikeFields(content: string): Partial<FrameAnalysis> | null {
  const partial: Partial<FrameAnalysis> = {};
  const keyValueMatches = content.matchAll(/"([^"]+)"\s*:\s*"([^"]*)"/g);

  for (const match of keyValueMatches) {
    const rawKey = match[1];
    const rawValue = match[2];

    if (typeof rawKey !== 'string' || typeof rawValue !== 'string') {
      continue;
    }

    const normalizedKey = normalizeKey(rawKey);

    for (const key of FRAME_ANALYSIS_KEYS) {
      if (FRAME_ANALYSIS_KEY_ALIASES[key].some((alias) => normalizeKey(alias) === normalizedKey)) {
        const value = rawValue.trim();
        if (value) {
          partial[key] = value;
        }
      }
    }
  }

  return Object.keys(partial).length > 0 ? partial : null;
}

function cleanupLabeledValue(rawValue: string) {
  const quotedMatches = Array.from(rawValue.matchAll(/["“]([^"”]+)["”]/g));
  if (quotedMatches.length > 0) {
    const quoted = quotedMatches.at(-1)?.[1]?.trim();
    if (quoted) {
      return quoted;
    }
  }

  let cleaned = rawValue
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  cleaned = cleaned.split(/(?<=[.!?])\s+/)[0] ?? cleaned;
  cleaned = cleaned.replace(/[;:,.]+$/, '').trim();

  return cleaned.length > 0 ? cleaned : null;
}

function extractLabeledFieldValue(content: string, labels: string[]) {
  let resolvedValue: string | null = null;

  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`${escaped}\\s*:\\s*([^\\n\\r]+)`, 'gi');
    let match: RegExpExecArray | null = regex.exec(content);

    while (match) {
      const cleaned = cleanupLabeledValue(match[1] ?? '');
      if (cleaned) {
        resolvedValue = cleaned;
      }
      match = regex.exec(content);
    }
  }

  return resolvedValue;
}

function parseAnalysisFromLabeledText(content: string): FrameAnalysis | null {
  const text = content
    .replace(/<\/?think>/gi, '\n')
    .replace(/<\/?answer>/gi, '\n')
    .replace(/\r/g, '\n');

  const partial: Partial<FrameAnalysis> = {};
  const subject = extractLabeledFieldValue(text, ['Subject', 'subject']);
  const scene = extractLabeledFieldValue(text, ['Scene', 'scene']);
  const colorTone = extractLabeledFieldValue(text, ['Color Tone', 'color tone', 'ColorTone']);
  const lighting = extractLabeledFieldValue(text, ['Lighting', 'lighting']);
  const style = extractLabeledFieldValue(text, ['Style', 'style']);
  const mood = extractLabeledFieldValue(text, ['Mood', 'mood']);
  const cameraAngle = extractLabeledFieldValue(text, ['Camera Angle', 'camera angle', 'Shot Type']);
  const cameraMovement = extractLabeledFieldValue(text, [
    'Camera Movement',
    'camera movement',
    'Camera Motion',
  ]);

  if (subject) {
    partial.subject = subject;
  }
  if (scene) {
    partial.scene = scene;
  }
  if (colorTone) {
    partial.colorTone = colorTone;
  }
  if (lighting) {
    partial.lighting = lighting;
  }
  if (style) {
    partial.style = style;
  }
  if (mood) {
    partial.mood = mood;
  }
  if (cameraAngle) {
    partial.cameraAngle = cameraAngle;
  }
  if (cameraMovement) {
    partial.cameraMovement = cameraMovement;
  }

  return finalizePartialFrameAnalysis(partial, 5);
}

function parseAnalysisResult(content: string) {
  const cleaned = extractJsonPayload(content);
  let rawPayload: unknown;

  try {
    rawPayload = JSON.parse(cleaned);
  } catch {
    const jsonLikeFields = extractJsonLikeFields(cleaned);
    const salvagedJsonLike = jsonLikeFields ? finalizePartialFrameAnalysis(jsonLikeFields, 5) : null;

    if (salvagedJsonLike) {
      console.warn('[ai-analyzer] salvaged analysis from partial JSON-like content.');
      return salvagedJsonLike;
    }

    const labeledTextAnalysis = parseAnalysisFromLabeledText(content);
    if (labeledTextAnalysis) {
      console.warn('[ai-analyzer] salvaged analysis from labeled thinking text.');
      return labeledTextAnalysis;
    }

    console.error(
      '[ai-analyzer] JSON.parse failed, raw content (first 2000 chars):',
      content.slice(0, 2000),
    );
    throw new HttpError('AI 返回了无法解析的 JSON 结果', 502, 'OPENAI_ANALYSIS_INVALID_JSON');
  }

  const strictResult = frameAnalysisSchema.safeParse(rawPayload);
  if (strictResult.success) {
    return strictResult.data;
  }

  const normalizedPayload = normalizeFrameAnalysisPayload(rawPayload);
  if (normalizedPayload) {
    console.warn(
      '[ai-analyzer] schema validation fallback applied, raw payload:',
      JSON.stringify(rawPayload).slice(0, 1000),
    );
    return normalizedPayload;
  }

  console.error(
    '[ai-analyzer] schema validation failed, raw payload:',
    JSON.stringify(rawPayload).slice(0, 1000),
    'zod error:',
    strictResult.error.message,
  );
  throw new HttpError('AI 返回的分析结果字段不完整', 502, 'OPENAI_ANALYSIS_INVALID_SCHEMA');
}

function shouldFallbackToChatCompletions(status: number, message: string) {
  if ([404, 405, 415, 501].includes(status)) {
    return true;
  }

  if (![400, 422].includes(status)) {
    return false;
  }

  const normalized = message.toLowerCase();

  return [
    '/v1/responses',
    'invalid url',
    'unknown url',
    'unsupported parameter',
    'responses api',
    'text.format',
    'max_output_tokens',
    'input_text',
    'input_image',
  ].some((keyword) => normalized.includes(keyword));
}

function shouldRetryChatWithoutSchema(status: number, message: string) {
  if (![400, 422].includes(status)) {
    return false;
  }

  const normalized = message.toLowerCase();

  return [
    'response_format',
    'json_schema',
    'schema',
    'unsupported parameter',
    'invalid parameter',
  ].some((keyword) => normalized.includes(keyword));
}

async function requestResponsesAnalysis(input: {
  timestamp: number;
  language: PromptLanguage;
  imagePath: string;
}): Promise<{ ok: true; analysis: FrameAnalysis } | { ok: false; status: number; message: string }> {
  const imageDataUrl = await encodeImageAsDataUrl(input.imagePath);
  const response = await fetch(buildOpenAIApiUrl('responses'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      max_output_tokens: getResponsesMaxOutputTokens(),
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: buildAnalysisInstruction({
                timestamp: input.timestamp,
                language: input.language,
                strictSpecificity: false,
              }),
            },
            {
              type: 'input_image',
              image_url: imageDataUrl,
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: OUTPUT_FORMAT_NAME,
          strict: true,
          schema: frameAnalysisJsonSchema,
        },
      },
      ...(shouldDisableThinkingMode()
        ? {
            thinking: {
              type: 'disabled',
            },
          }
        : {}),
    }),
  }).catch((networkError: unknown) => {
    console.error(
      '[ai-analyzer] responses API fetch failed:',
      networkError instanceof Error ? `${networkError.name}: ${networkError.message}` : networkError,
    );
    console.error('[ai-analyzer] responses API raw error object:', networkError);
    const cause = (networkError as { cause?: unknown })?.cause;
    if (cause !== undefined) {
      console.error('[ai-analyzer] responses API fetch cause:', cause);
    }
    throw new HttpError('AI 接口请求失败，请检查网络或 API 配置', 502, 'OPENAI_REQUEST_FAILED');
  });

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: await parseOpenAIError(response),
    };
  }

  let payload: OpenAIResponsesApiResult;

  try {
    payload = (await response.json()) as OpenAIResponsesApiResult;
  } catch {
    throw new HttpError('AI 返回了无法解析的响应内容', 502, 'OPENAI_RESPONSE_INVALID');
  }

  const content = extractResponsesText(payload);

  if (!content) {
    console.error(
      '[ai-analyzer] responses API empty content, raw payload:',
      JSON.stringify(payload).slice(0, 2000),
    );
    throw new HttpError('AI 未返回可用的结构化分析结果', 502, 'OPENAI_ANALYSIS_EMPTY');
  }

  return {
    ok: true,
    analysis: parseAnalysisResult(content),
  };
}

async function requestChatCompletionsAnalysis(input: {
  timestamp: number;
  language: PromptLanguage;
  imagePath: string;
  useSchema: boolean;
  attempt: number;
}): Promise<FrameAnalysis> {
  const imageDataUrl = await encodeImageAsDataUrl(input.imagePath);
  const responseFormat = input.useSchema
    ? shouldUseJsonObjectResponseFormat()
      ? {
          type: 'json_object' as const,
        }
      : {
          type: 'json_schema' as const,
          json_schema: {
            name: OUTPUT_FORMAT_NAME,
            strict: true,
            schema: frameAnalysisJsonSchema,
          },
        }
    : undefined;

  const response = await fetch(buildOpenAIApiUrl('chat/completions'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      max_tokens: getChatCompletionMaxTokens(input.attempt),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: buildAnalysisInstruction({
                timestamp: input.timestamp,
                language: input.language,
                strictSpecificity: input.attempt > 0,
              }),
            },
            {
              type: 'image_url',
              image_url: {
                url: imageDataUrl,
              },
            },
          ],
        },
      ],
      ...(responseFormat ? { response_format: responseFormat } : {}),
      ...(shouldDisableThinkingMode()
        ? {
            thinking: {
              type: 'disabled',
            },
          }
        : {}),
    }),
  }).catch((networkError: unknown) => {
    console.error(
      '[ai-analyzer] chat/completions fetch failed:',
      networkError instanceof Error ? `${networkError.name}: ${networkError.message}` : networkError,
    );
    if (networkError instanceof Error && 'cause' in networkError) {
      console.error('[ai-analyzer] chat/completions fetch cause:', networkError.cause);
    }
    throw new HttpError('AI 接口请求失败，请检查网络或 API 配置', 502, 'OPENAI_REQUEST_FAILED');
  });

  if (!response.ok) {
    const errorMessage = await parseOpenAIError(response);

    if (input.useSchema && shouldRetryChatWithoutSchema(response.status, errorMessage)) {
      return requestChatCompletionsAnalysis({
        ...input,
        useSchema: false,
        attempt: input.attempt + 1,
      });
    }

    throw new HttpError(errorMessage, 502, 'OPENAI_ANALYSIS_FAILED');
  }

  let payload: OpenAIChatCompletionsApiResult;

  try {
    payload = (await response.json()) as OpenAIChatCompletionsApiResult;
  } catch {
    throw new HttpError('AI 返回了无法解析的响应内容', 502, 'OPENAI_RESPONSE_INVALID');
  }

  const content = extractChatCompletionText(payload);

  if (!content) {
    console.error(
      '[ai-analyzer] chat/completions empty content, raw payload:',
      JSON.stringify(payload).slice(0, 2000),
    );
    throw new HttpError('AI 未返回可用的结构化分析结果', 502, 'OPENAI_ANALYSIS_EMPTY');
  }

  try {
    const parsed = parseAnalysisResult(content);
    const specificityScore = getAnalysisSpecificityScore(parsed);

    if (specificityScore < 6 && input.attempt < 2) {
      console.warn(
        '[ai-analyzer] low specificity analysis detected, retrying with stricter prompt.',
        {
          specificityScore,
          attempt: input.attempt,
        },
      );
      return requestChatCompletionsAnalysis({
        ...input,
        useSchema: false,
        attempt: input.attempt + 1,
      });
    }

    return parsed;
  } catch (error) {
    if (
      error instanceof HttpError &&
      ['OPENAI_ANALYSIS_INVALID_SCHEMA', 'OPENAI_ANALYSIS_INVALID_JSON'].includes(error.code) &&
      input.attempt < 2
    ) {
      return requestChatCompletionsAnalysis({
        ...input,
        useSchema: false,
        attempt: input.attempt + 1,
      });
    }

    throw error;
  }
}

async function analyzeFrameWithOpenAI(input: {
  timestamp: number;
  language: PromptLanguage;
  imagePath: string;
}): Promise<FrameAnalysis> {
  if (!env.OPENAI_API_KEY) {
    throw new HttpError(
      'ANALYSIS_PROVIDER=openai 但未配置 OPENAI_API_KEY，无法执行真实分析',
      500,
      'OPENAI_API_KEY_MISSING',
    );
  }

  if (env.OPENAI_API_STYLE === 'chat') {
    return requestChatCompletionsAnalysis({
      ...input,
      useSchema: true,
      attempt: 0,
    });
  }

  const responsesResult = await requestResponsesAnalysis(input);

  if (responsesResult.ok) {
    return responsesResult.analysis;
  }

  if (shouldFallbackToChatCompletions(responsesResult.status, responsesResult.message)) {
    return requestChatCompletionsAnalysis({
      ...input,
      useSchema: true,
      attempt: 0,
    });
  }

  throw new HttpError(responsesResult.message, 502, 'OPENAI_ANALYSIS_FAILED');
}

export async function analyzeFrame(input: {
  timestamp: number;
  language: PromptLanguage;
  imagePath: string;
}): Promise<FrameAnalysis> {
  if (env.ANALYSIS_PROVIDER === 'mock') {
    return mockAnalysis(input.timestamp);
  }

  return analyzeFrameWithOpenAI(input);
}
