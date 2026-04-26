import { createI18n } from 'vue-i18n';

import enUS from '@/locales/en-US';
import zhCN from '@/locales/zh-CN';

export const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

const LOCALE_STORAGE_KEY = 'vtp.locale';
const DEFAULT_LOCALE: AppLocale = 'zh-CN';

const localeAliases: Record<string, AppLocale> = {
  zh: 'zh-CN',
  'zh-cn': 'zh-CN',
  'zh-hans': 'zh-CN',
  en: 'en-US',
  'en-us': 'en-US',
};

function normalizeLocale(value: string | null | undefined): AppLocale | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized in localeAliases) {
    return localeAliases[normalized];
  }

  for (const locale of SUPPORTED_LOCALES) {
    if (normalized.startsWith(locale.toLowerCase())) {
      return locale;
    }
  }

  return null;
}

function detectLocale(): AppLocale {
  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE;
  }

  const savedLocale = normalizeLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
  if (savedLocale) {
    return savedLocale;
  }

  const browserCandidates = [...(window.navigator.languages ?? []), window.navigator.language];

  for (const candidate of browserCandidates) {
    const locale = normalizeLocale(candidate);
    if (locale) {
      return locale;
    }
  }

  return DEFAULT_LOCALE;
}

export const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'en-US',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
});

export function syncDocumentLanguage(locale: AppLocale) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
  }
}

export function setAppLocale(locale: AppLocale) {
  i18n.global.locale.value = locale;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }
  syncDocumentLanguage(locale);
}

export function resolveDateLocale(locale: string) {
  return locale === 'zh-CN' ? 'zh-CN' : 'en-US';
}

syncDocumentLanguage(i18n.global.locale.value as AppLocale);
