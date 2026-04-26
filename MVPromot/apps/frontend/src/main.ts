import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { createPinia } from 'pinia';
import { createApp } from 'vue';

import { setupHttpInterceptors } from '@/api/interceptors';
import { i18n } from '@/i18n';
import { useAuthStore } from '@/stores/auth';

import App from './App.vue';
import { router } from './router';
import './style.css';

async function bootstrap() {
  const app = createApp(App);
  const queryClient = new QueryClient();
  const pinia = createPinia();

  app.use(pinia);
  setupHttpInterceptors(pinia, router);

  const authStore = useAuthStore(pinia);
  authStore.hydrateFromStorage();

  if (authStore.accessToken && !authStore.user) {
    try {
      await authStore.fetchMe();
    } catch {
      authStore.clearAuth();
    }
  }

  app.use(router);
  app.use(i18n);
  app.use(VueQueryPlugin, { queryClient });
  app.mount('#app');
}

void bootstrap();
