export type PromptPlatform = 'sora' | 'runway' | 'kling' | 'pika' | 'wan' | 'hailuo';
export type SampleDensity = 'low' | 'medium' | 'high';
export type PromptLanguage = 'zh' | 'en' | 'bilingual';
export type AnalysisStatus = 'PENDING' | 'EXTRACTING' | 'ANALYZING' | 'DONE' | 'FAILED';

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
  prompts: Record<string, string>;
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
  overallPrompt: Record<string, string> | null;
  frames: AnalysisFrame[];
}
