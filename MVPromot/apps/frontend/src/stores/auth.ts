import { defineStore } from 'pinia';

import {
  loginRequest,
  logoutRequest,
  meRequest,
  refreshRequest,
  registerRequest,
} from '@/api/auth';
import type { AuthPayload, AuthUser } from '@/types/auth';

const AUTH_STORAGE_KEY = 'vtp_auth';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;
}

function decodeJwtPayload(token: string) {
  const [, payload] = token.split('.');

  if (!payload) {
    return null;
  }

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const json = atob(padded);
    return JSON.parse(json) as { exp?: number };
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    accessToken: null,
    refreshToken: null,
    hydrated: false,
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.accessToken && state.user),
  },

  actions: {
    hydrateFromStorage() {
      if (this.hydrated) {
        return;
      }

      try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!raw) {
          this.hydrated = true;
          return;
        }

        const parsed = JSON.parse(raw) as AuthState;
        this.user = parsed.user;
        this.accessToken = parsed.accessToken;
        this.refreshToken = parsed.refreshToken;
      } catch {
        this.clearAuth();
      } finally {
        this.hydrated = true;
      }
    },

    persist() {
      const payload: AuthState = {
        user: this.user,
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        hydrated: true,
      };

      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
    },

    clearAuth() {
      this.user = null;
      this.accessToken = null;
      this.refreshToken = null;
      localStorage.removeItem(AUTH_STORAGE_KEY);
    },

    applyAuth(payload: AuthPayload) {
      this.user = payload.user;
      this.accessToken = payload.accessToken;
      this.refreshToken = payload.refreshToken;
      this.persist();
    },

    async register(input: { email: string; password: string; name?: string }) {
      const payload = await registerRequest(input);
      this.applyAuth(payload);
      return payload;
    },

    async login(input: { email: string; password: string }) {
      const payload = await loginRequest(input);
      this.applyAuth(payload);
      return payload;
    },

    async fetchMe() {
      if (!this.accessToken) {
        return null;
      }

      const { user } = await meRequest(this.accessToken);
      this.user = user;
      this.persist();
      return user;
    },

    async refreshSession() {
      if (!this.refreshToken) {
        return null;
      }

      const tokens = await refreshRequest(this.refreshToken);
      this.accessToken = tokens.accessToken;
      this.refreshToken = tokens.refreshToken;
      this.persist();
      return tokens.accessToken;
    },

    accessTokenExpiresSoon(bufferSeconds = 30) {
      if (!this.accessToken) {
        return true;
      }

      const payload = decodeJwtPayload(this.accessToken);
      const exp = payload?.exp;

      if (!exp) {
        return true;
      }

      const nowSeconds = Math.floor(Date.now() / 1000);
      return exp <= nowSeconds + bufferSeconds;
    },

    async ensureFreshAccessToken() {
      if (!this.accessToken) {
        return null;
      }

      if (!this.accessTokenExpiresSoon()) {
        return this.accessToken;
      }

      const nextToken = await this.refreshSession().catch(() => null);

      if (!nextToken) {
        this.clearAuth();
        return null;
      }

      return nextToken;
    },

    async logout() {
      const currentAccessToken = this.accessToken;
      const currentRefreshToken = this.refreshToken;

      try {
        if (currentAccessToken) {
          await logoutRequest({
            accessToken: currentAccessToken,
            refreshToken: currentRefreshToken,
          });
        }
      } finally {
        this.clearAuth();
      }
    },
  },
});
