export type UrlVideoPlatform = 'youtube' | 'bilibili';
export type UrlMetaSource = 'live';
export type UrlDownloadMode = 'downloaded';
export type UrlDownloadTaskStatus = 'PENDING' | 'DOWNLOADING' | 'DONE' | 'FAILED';

export interface ParseVideoUrlPayload {
  url: string;
  agreedToTerms: boolean;
}

export interface ParsedVideoUrlResponse {
  platform: UrlVideoPlatform;
  normalizedUrl: string;
  title: string;
  duration: number;
  qualities: string[];
  source: UrlMetaSource;
}

export interface DownloadVideoUrlResponse {
  fileId: string;
  temporaryPath: string;
  platform: UrlVideoPlatform;
  title: string;
  duration: number;
  source: UrlMetaSource;
  mode: UrlDownloadMode;
}

export interface StartDownloadVideoUrlResponse {
  taskId: string;
  status: UrlDownloadTaskStatus;
  progress: number;
  errorMessage: string | null;
  result: DownloadVideoUrlResponse | null;
  createdAt: string;
  updatedAt: string;
}

export type DownloadVideoUrlStatusResponse = StartDownloadVideoUrlResponse;
