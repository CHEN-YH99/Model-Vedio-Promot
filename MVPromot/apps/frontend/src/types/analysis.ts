export type PromptPlatform = 'sora' | 'runway' | 'kling' | 'pika' | 'wan' | 'hailuo';
export type SampleDensity = 'low' | 'medium' | 'high';
export type PromptLanguage = 'zh' | 'en' | 'bilingual';
export type AnalysisStatus = 'PENDING' | 'EXTRACTING' | 'ANALYZING' | 'DONE' | 'FAILED';

export interface PromptLanguageMap {
  zh: string;
  en: string;
  bilingual: string;
}

export interface PlatformPromptContent {
  prompt: PromptLanguageMap;
  negativePrompt?: PromptLanguageMap;
}

export type PromptPayload = string | PlatformPromptContent;
export type PromptPayloadMap = Record<string, PromptPayload>;

export interface AnalysisStartPayload {
  fileId: string;
  config: {
    sampleDensity: SampleDensity;
    platforms: PromptPlatform[];
    language: PromptLanguage;
  };
}

export interface AnalysisStatusResponse {
  analysisId: string;
  status: AnalysisStatus;
  progress: number;
  errorMessage: string | null;
  frameCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisFrame {
  id: string;
  timestamp: number;
  thumbUrl: string;
  rawAnalysis: Record<string, string>;
  prompts: PromptPayloadMap;
}

export interface AnalysisResultResponse {
  analysisId: string;
  fileId: string;
  status: AnalysisStatus;
  progress: number;
  errorMessage: string | null;
  config: {
    sampleDensity: SampleDensity;
    platforms: PromptPlatform[];
    language: PromptLanguage;
  };
  styleTags: string[];
  overallPrompt: PromptPayloadMap | null;
  frames: AnalysisFrame[];
}
