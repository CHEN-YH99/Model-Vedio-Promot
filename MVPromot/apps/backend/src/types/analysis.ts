export type SampleDensity = 'low' | 'medium' | 'high';
export type PromptLanguage = 'zh' | 'en' | 'bilingual';
export type PromptPlatform = 'sora' | 'runway' | 'kling' | 'pika' | 'wan' | 'hailuo';

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

export interface ExtractedFrame {
  timestamp: number;
  fileName: string;
  absolutePath: string;
  thumbUrl: string;
}
