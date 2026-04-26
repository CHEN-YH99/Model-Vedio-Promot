export type UrlVideoPlatform = 'youtube' | 'bilibili';
export type UrlMetaSource = 'live';
export type UrlDownloadMode = 'downloaded';

export type UploadUrlTaskStatus = 'PENDING' | 'DOWNLOADING' | 'DONE' | 'FAILED';

export interface DownloadVideoUrlResult {
  fileId: string;
  temporaryPath: string;
  platform: UrlVideoPlatform;
  title: string;
  duration: number;
  source: UrlMetaSource;
  mode: UrlDownloadMode;
}

export interface UploadUrlTaskRecord {
  taskId: string;
  userId: string;
  status: UploadUrlTaskStatus;
  progress: number;
  errorMessage: string | null;
  result: DownloadVideoUrlResult | null;
  createdAt: string;
  updatedAt: string;
}
