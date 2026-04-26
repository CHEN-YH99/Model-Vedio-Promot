export type SampleDensity = 'low' | 'medium' | 'high';
export type PromptLanguage = 'zh' | 'en' | 'bilingual';
export type PromptPlatform = 'sora' | 'runway' | 'kling' | 'pika' | 'wan' | 'hailuo';
export const PROMPT_LANGUAGES: PromptLanguage[] = ['zh', 'en', 'bilingual'];
export const NEGATIVE_PROMPT_PLATFORMS: PromptPlatform[] = ['kling', 'pika', 'wan', 'hailuo'];

export interface AnalysisConfig {
  sampleDensity: SampleDensity;
  platforms: PromptPlatform[];
  language: PromptLanguage;
}

export interface FrameAnalysis {
  subject: string;
  scene: string;
  colorTone: string;
  lighting: string;
  style: string;
  mood: string;
  cameraAngle: string;
  cameraMovement: string;
}

export interface PromptLanguageMap {
  zh: string;
  en: string;
  bilingual: string;
}

export interface PlatformPromptContent {
  prompt: PromptLanguageMap;
  negativePrompt?: PromptLanguageMap;
}

export interface ExtractedFrame {
  timestamp: number;
  fileName: string;
  absolutePath: string;
  thumbUrl: string;
}
