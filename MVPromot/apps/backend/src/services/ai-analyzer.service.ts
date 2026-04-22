import path from 'node:path';
import { readFile } from 'node:fs/promises';

import { z } from 'zod';

import { env } from '../config/env.js';
import type { FrameAnalysis, PromptLanguage } from '../types/analysis.js';
import { HttpError } from '../utils/http-error.js';

const OUTPUT_FORMAT_NAME = 'frame_analysis';

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

function buildAnalysisInstruction(input: { timestamp: number; language: PromptLanguage }) {
  const languageNote =
    input.language === 'zh'
      ? 'The downstream prompt output will be Chinese.'
      : input.language === 'bilingual'
        ? 'The downstream prompt output will be bilingual.'
        : 'The downstream prompt output will be English.';

  return [
    'You are analyzing a single keyframe from a source video for prompt generation.',
    'Return concise, production-ready JSON only.',
    'All field values must be short English phrases so downstream prompt templates can localize them.',
    'Infer camera movement conservatively. If motion cannot be inferred from one frame, use "locked camera".',
    'Avoid generic filler like "beautiful" or "nice".',
    languageNote,
    `Frame timestamp: ${input.timestamp.toFixed(3)} seconds.`,
  ].join(' ');
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
  const trimmed = content.trim();

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

function parseAnalysisResult(content: string) {
  const cleaned = extractJsonPayload(content);
  let rawPayload: unknown;

  try {
    rawPayload = JSON.parse(cleaned);
  } catch {
    console.error(
      '[ai-analyzer] JSON.parse failed, raw content (first 2000 chars):',
      content.slice(0, 2000),
    );
    throw new HttpError('AI 返回了无法解析的 JSON 结果', 502, 'OPENAI_ANALYSIS_INVALID_JSON');
  }

  try {
    return frameAnalysisSchema.parse(rawPayload);
  } catch (error) {
    console.error(
      '[ai-analyzer] schema validation failed, raw payload:',
      JSON.stringify(rawPayload).slice(0, 1000),
      'zod error:',
      error instanceof Error ? error.message : error,
    );
    throw new HttpError('AI 返回的分析结果字段不完整', 502, 'OPENAI_ANALYSIS_INVALID_SCHEMA');
  }
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
      max_output_tokens: 400,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: buildAnalysisInstruction({
                timestamp: input.timestamp,
                language: input.language,
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
}): Promise<FrameAnalysis> {
  const imageDataUrl = await encodeImageAsDataUrl(input.imagePath);
  const response = await fetch(buildOpenAIApiUrl('chat/completions'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: buildAnalysisInstruction({
                timestamp: input.timestamp,
                language: input.language,
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
      ...(input.useSchema
        ? {
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: OUTPUT_FORMAT_NAME,
                strict: true,
                schema: frameAnalysisJsonSchema,
              },
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

  return parseAnalysisResult(content);
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
