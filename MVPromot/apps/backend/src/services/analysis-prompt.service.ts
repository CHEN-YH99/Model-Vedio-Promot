import type { FrameAnalysis, PromptLanguage, PromptPlatform } from '../types/analysis.js';

const SUPPORTED_PLATFORMS: PromptPlatform[] = ['sora', 'runway', 'kling', 'pika', 'wan', 'hailuo'];

export function normalizePlatforms(input: string[] | undefined): PromptPlatform[] {
  if (!input || input.length === 0) {
    return ['sora', 'runway'];
  }

  const normalized = input
    .map((item) => item.toLowerCase())
    .filter((item): item is PromptPlatform => SUPPORTED_PLATFORMS.includes(item as PromptPlatform));

  if (normalized.length === 0) {
    return ['sora', 'runway'];
  }

  return Array.from(new Set(normalized));
}

function byLanguage(input: { zh: string; en: string }, language: PromptLanguage): string {
  if (language === 'zh') {
    return input.zh;
  }

  if (language === 'en') {
    return input.en;
  }

  return `中文：${input.zh}\nEnglish: ${input.en}`;
}

export function generatePromptByPlatform(input: {
  platform: PromptPlatform;
  analysis: FrameAnalysis;
  language: PromptLanguage;
}): string {
  const { platform, analysis, language } = input;

  const enBase = {
    sora: `${analysis.scene}, ${analysis.subject}, ${analysis.cameraMovement}, ${analysis.cameraAngle}, ${analysis.style}, ${analysis.lighting}, ${analysis.colorTone}, ${analysis.mood}, cinematic detail`,
    runway: `${analysis.cameraMovement}, ${analysis.cameraAngle}, ${analysis.subject}, ${analysis.scene}, ${analysis.style}, ${analysis.lighting}, ${analysis.mood}, realistic texture`,
    kling: `${analysis.subject}, ${analysis.scene}, ${analysis.cameraMovement}, ${analysis.cameraAngle}, ${analysis.style}, ${analysis.lighting}, ${analysis.mood}`,
    pika: `${analysis.subject}, ${analysis.scene}, ${analysis.cameraMovement}, ${analysis.mood}, ${analysis.style}, dynamic motion`,
    wan: `${analysis.subject}, ${analysis.scene}, ${analysis.cameraMovement}, ${analysis.style}, ${analysis.colorTone}, ${analysis.lighting}, ${analysis.mood}`,
    hailuo: `${analysis.subject}, ${analysis.scene}, ${analysis.cameraMovement}, ${analysis.style}, ${analysis.lighting}, ${analysis.mood}`,
  } as const;

  const zhBase = {
    sora: `${analysis.scene}，${analysis.subject}，${analysis.cameraMovement}，${analysis.cameraAngle}，${analysis.style}，${analysis.lighting}，${analysis.colorTone}，${analysis.mood}，电影级细节`,
    runway: `${analysis.cameraMovement}，${analysis.cameraAngle}，${analysis.subject}，${analysis.scene}，${analysis.style}，${analysis.lighting}，${analysis.mood}，真实纹理`,
    kling: `${analysis.subject}，${analysis.scene}，${analysis.cameraMovement}，${analysis.cameraAngle}，${analysis.style}，${analysis.lighting}，${analysis.mood}`,
    pika: `${analysis.subject}，${analysis.scene}，${analysis.cameraMovement}，${analysis.mood}，${analysis.style}，动态运动感`,
    wan: `${analysis.subject}，${analysis.scene}，${analysis.cameraMovement}，${analysis.style}，${analysis.colorTone}，${analysis.lighting}，${analysis.mood}`,
    hailuo: `${analysis.subject}，${analysis.scene}，${analysis.cameraMovement}，${analysis.style}，${analysis.lighting}，${analysis.mood}`,
  } as const;

  return byLanguage(
    {
      zh: zhBase[platform],
      en: enBase[platform],
    },
    language,
  );
}

export function summarizeAnalysisFrames(frames: FrameAnalysis[]): FrameAnalysis {
  if (frames.length === 0) {
    return {
      subject: 'main subject',
      scene: 'generic scene',
      colorTone: 'balanced color tone',
      lighting: 'soft lighting',
      style: 'cinematic',
      mood: 'neutral',
      cameraAngle: 'medium shot',
      cameraMovement: 'steady camera',
    };
  }

  const pickMost = <K extends keyof FrameAnalysis>(key: K) => {
    const counter = new Map<string, number>();
    const fallback = frames[0] as FrameAnalysis;

    for (const frame of frames) {
      const value = frame[key].trim();
      counter.set(value, (counter.get(value) ?? 0) + 1);
    }

    let winner = fallback[key];
    let max = 0;

    for (const [value, count] of counter) {
      if (count > max) {
        max = count;
        winner = value as FrameAnalysis[K];
      }
    }

    return winner;
  };

  return {
    subject: pickMost('subject'),
    scene: pickMost('scene'),
    colorTone: pickMost('colorTone'),
    lighting: pickMost('lighting'),
    style: pickMost('style'),
    mood: pickMost('mood'),
    cameraAngle: pickMost('cameraAngle'),
    cameraMovement: pickMost('cameraMovement'),
  };
}

export function generateOverallPromptByPlatform(input: {
  frames: FrameAnalysis[];
  platforms: PromptPlatform[];
  language: PromptLanguage;
}) {
  const summary = summarizeAnalysisFrames(input.frames);

  return input.platforms.reduce<Record<string, string>>((acc, platform) => {
    acc[platform] = generatePromptByPlatform({
      platform,
      analysis: summary,
      language: input.language,
    });
    return acc;
  }, {});
}

export function extractStyleTags(frames: FrameAnalysis[]): string[] {
  const tags = new Set<string>();

  for (const frame of frames) {
    [
      frame.style,
      frame.mood,
      frame.colorTone,
      frame.lighting,
      frame.cameraMovement,
      frame.cameraAngle,
    ].forEach((tag) => {
      const normalized = tag.trim().toLowerCase();
      if (normalized.length > 0) {
        tags.add(normalized);
      }
    });

    if (tags.size >= 20) {
      break;
    }
  }

  return Array.from(tags).slice(0, 20);
}
