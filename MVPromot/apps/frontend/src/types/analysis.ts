export type PromptPlatform =
  | 'sora'
  | 'runway'
  | 'kling'
  | 'pika'
  | 'wan'
  | 'hailuo'
  | 'seedance'
  | 'happyhorse';
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
export type AnalysisExportFormat = 'txt' | 'json';

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

export interface UpdateFramePromptPayload {
  platform: PromptPlatform;
  language: PromptLanguage;
  prompt: string;
  negativePrompt?: string;
}

export interface AnalysisFrameMutationResponse {
  frame: AnalysisFrame;
  overallPrompt: PromptPayloadMap | null;
  styleTags: string[];
}

export interface AnalysisShareCreateResponse {
  token: string;
  sharePath: string;
  expiresAt: string;
}

export interface SharedAnalysisResultResponse extends AnalysisResultResponse {
  shareToken: string;
  expiresAt: string | null;
}

export interface AnalysisQuotaResponse {
  plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  limit: number | null;
  used: number;
  remaining: number | null;
  isUnlimited: boolean;
  exceeded: boolean;
  resetAt: string;
}

export interface AnalysisHistoryItem {
  analysisId: string;
  fileId: string;
  status: AnalysisStatus;
  progress: number;
  errorMessage: string | null;
  sampleDensity: SampleDensity;
  platforms: PromptPlatform[];
  language: PromptLanguage;
  frameCount: number;
  coverThumbUrl: string | null;
  styleTags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisHistoryResponse {
  items: AnalysisHistoryItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AnalysisDeleteResponse {
  analysisId: string;
  deleted: boolean;
}
