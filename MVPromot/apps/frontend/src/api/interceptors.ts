import type { AxiosError, AxiosRequestConfig } from 'axios';
import type { Pinia } from 'pinia';
import type { Router } from 'vue-router';

import { useAuthStore } from '@/stores/auth';

import { http } from './http';

let isRefreshing = false;
let requestQueue: Array<(token: string | null) => void> = [];

function isAuthEndpoint(url: string | undefined) {
  if (!url) {
    return false;
  }

  return (
    url.includes('/api/auth/login') ||
    url.includes('/api/auth/register') ||
    url.includes('/api/auth/refresh')
  );
}

function flushQueue(token: string | null) {
  requestQueue.forEach((handler) => handler(token));
  requestQueue = [];
}

export function setupHttpInterceptors(pinia: Pinia, router: Router) {
  const authStore = useAuthStore(pinia);

  http.interceptors.request.use((config) => {
    if (authStore.accessToken) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${authStore.accessToken}`;
    }

    return config;
  });

  http.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = (error.config ?? {}) as AxiosRequestConfig & { _retry?: boolean };
      const status = error.response?.status;

      if (status !== 401 || originalRequest._retry || isAuthEndpoint(originalRequest.url)) {
        throw error;
      }

      if (!authStore.refreshToken) {
        authStore.clearAuth();
        await router.push('/login');
        throw error;
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          requestQueue.push((token) => {
            if (!token) {
              reject(error);
              return;
            }

            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(http(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const nextToken = await authStore.refreshSession();
        flushQueue(nextToken);

        if (!nextToken) {
          throw error;
        }

        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${nextToken}`;

        return http(originalRequest);
      } catch (refreshError) {
        flushQueue(null);
        authStore.clearAuth();
        await router.push('/login');
        throw refreshError;
      } finally {
        isRefreshing = false;
      }
    },
  );
}
