import { defineStore } from 'pinia';

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface UploadState {
  status: UploadStatus;
  progress: number;
  errorMessage: string;
  lastFileId: string | null;
}

export const useUploadStore = defineStore('upload', {
  state: (): UploadState => ({
    status: 'idle',
    progress: 0,
    errorMessage: '',
    lastFileId: null,
  }),

  actions: {
    startUpload() {
      this.status = 'uploading';
      this.progress = 0;
      this.errorMessage = '';
      this.lastFileId = null;
    },

    updateProgress(value: number) {
      this.progress = Math.max(0, Math.min(100, value));
    },

    markSuccess(fileId: string) {
      this.status = 'success';
      this.progress = 100;
      this.lastFileId = fileId;
      this.errorMessage = '';
    },

    markError(message: string) {
      this.status = 'error';
      this.errorMessage = message;
    },

    reset() {
      this.status = 'idle';
      this.progress = 0;
      this.errorMessage = '';
      this.lastFileId = null;
    },
  },
});
