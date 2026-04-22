import { defineStore } from 'pinia';

interface AppState {
  projectPhase: 'setup' | 'development';
}

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    projectPhase: 'setup',
  }),
});
