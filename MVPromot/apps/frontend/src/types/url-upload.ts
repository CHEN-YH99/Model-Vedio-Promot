export type UrlVideoPlatform = 'youtube' | 'bilibili';
export type UrlMetaSource = 'live' | 'fallback';
export type UrlDownloadMode = 'downloaded' | 'sample_fallback';

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
