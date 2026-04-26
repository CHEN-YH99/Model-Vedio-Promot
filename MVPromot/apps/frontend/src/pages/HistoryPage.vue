<template>
  <section class="vtp-page px-0 py-10">
    <div class="vtp-panel rounded-[2rem] p-6 md:p-10">
      <p class="vtp-kicker">History</p>
      <h1 class="vtp-title mt-4 max-w-[12ch]">{{ t('history.title') }}</h1>
      <p class="vtp-body mt-4 max-w-3xl">
        {{ t('history.subtitle') }}
      </p>
    </div>

    <div class="mt-6 space-y-4">
      <div
        v-if="loading"
        class="space-y-4"
      >
        <div
          v-for="index in 3"
          :key="`history-skeleton-${index}`"
          class="vtp-panel grid animate-pulse gap-4 rounded-[1.75rem] p-5 md:grid-cols-[220px_1fr_auto]"
        >
          <div class="aspect-video rounded-[1.25rem] bg-white/8"></div>
          <div class="space-y-3 py-2">
            <div class="h-5 w-40 rounded bg-white/10"></div>
            <div class="h-4 w-64 rounded bg-white/10"></div>
            <div class="h-4 w-52 rounded bg-white/10"></div>
          </div>
          <div class="flex items-center justify-end gap-2">
            <div class="h-9 w-20 rounded-full bg-white/10"></div>
            <div class="h-9 w-20 rounded-full bg-white/10"></div>
          </div>
        </div>
      </div>

      <p
        v-else-if="errorMessage"
        class="rounded-lg border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-sm text-rose-200"
      >
        {{ errorMessage }}
      </p>

      <div v-else-if="items.length === 0" class="vtp-panel rounded-[1.5rem] p-6 text-sm text-slate-300">
        {{ t('history.empty') }}
      </div>

      <article
        v-for="item in items"
        :key="item.analysisId"
        class="vtp-panel grid gap-4 rounded-[1.75rem] p-5 md:grid-cols-[220px_1fr_auto] md:items-center"
      >
        <div class="overflow-hidden rounded-[1.25rem] border border-white/10 bg-white/5">
          <LazyImage
            v-if="item.coverThumbUrl"
            :src="toImageUrl(item.coverThumbUrl)"
            :alt="t('history.coverAlt')"
            image-class="aspect-video w-full object-cover"
            wrapper-class="relative overflow-hidden"
          />
          <div v-else class="flex aspect-video items-center justify-center text-xs text-slate-400">
            {{ t('history.noCover') }}
          </div>
        </div>

        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="font-[var(--font-display)] text-xl font-semibold text-white">
              {{ platformSummary(item.platforms) }}
            </h2>
            <span class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
              {{ statusLabel(item.status) }}
            </span>
          </div>

          <p class="mt-2 text-sm text-slate-300">
            {{
              t('history.meta', {
                createdAt: formatDate(item.createdAt),
                frameCount: item.frameCount,
                language: languageLabel(item.language),
              })
            }}
          </p>
          <p class="mt-2 text-sm text-slate-400">analysisId: {{ item.analysisId }}</p>

          <div class="mt-3 flex flex-wrap gap-2">
            <span
              v-for="tag in item.styleTags.slice(0, 6)"
              :key="tag"
              class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200"
            >
              {{ tag }}
            </span>
          </div>
        </div>

        <div class="flex flex-wrap gap-2 md:justify-end">
          <button class="vtp-button" @click="goResult(item.analysisId)">{{ t('history.viewResult') }}</button>
          <button
            class="vtp-button vtp-button--ghost"
            :disabled="deletingId === item.analysisId"
            @click="removeItem(item.analysisId)"
          >
            {{ deletingId === item.analysisId ? t('history.deleting') : t('history.delete') }}
          </button>
        </div>
      </article>

      <div v-if="totalPages > 1" class="vtp-panel flex items-center justify-between rounded-[1.5rem] p-4">
        <p class="text-sm text-slate-300">
          {{ t('history.pagination', { page, totalPages, total }) }}
        </p>
        <div class="flex gap-2">
          <button class="vtp-button vtp-button--ghost" :disabled="page <= 1" @click="changePage(page - 1)">
            {{ t('history.prevPage') }}
          </button>
          <button
            class="vtp-button vtp-button--ghost"
            :disabled="page >= totalPages"
            @click="changePage(page + 1)"
          >
            {{ t('history.nextPage') }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import axios from 'axios';
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { deleteAnalysisRequest, getAnalysisHistoryRequest } from '@/api/analysis';
import { apiBaseUrl } from '@/api/http';
import LazyImage from '@/components/LazyImage.vue';
import { resolveDateLocale } from '@/i18n';
import type { AnalysisHistoryItem, AnalysisStatus, PromptLanguage, PromptPlatform } from '@/types/analysis';

const router = useRouter();
const { t, locale } = useI18n();

const loading = ref(false);
const errorMessage = ref('');
const deletingId = ref('');

const items = ref<AnalysisHistoryItem[]>([]);
const page = ref(1);
const limit = ref(10);
const total = ref(0);
const totalPages = ref(0);

function toImageUrl(thumbUrl: string) {
  if (thumbUrl.startsWith('http://') || thumbUrl.startsWith('https://')) {
    return thumbUrl;
  }

  const assetPath = thumbUrl.startsWith('/') ? thumbUrl : `/${thumbUrl}`;

  if (apiBaseUrl) {
    return `${apiBaseUrl}${assetPath}`;
  }

  if (typeof window !== 'undefined') {
    return new URL(assetPath, window.location.origin).toString();
  }

  return assetPath;
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(resolveDateLocale(locale.value), { hour12: false });
}

function platformSummary(platforms: PromptPlatform[]) {
  if (platforms.length === 0) {
    return t('history.noPlatforms');
  }

  return platforms.map((item) => platformLabel(item)).join(' / ');
}

function platformLabel(platform: PromptPlatform) {
  const map: Record<PromptPlatform, string> = {
    sora: t('enum.platform.sora'),
    runway: t('enum.platform.runway'),
    kling: t('enum.platform.kling'),
    pika: t('enum.platform.pika'),
    wan: t('enum.platform.wan'),
    hailuo: t('enum.platform.hailuo'),
    seedance: t('enum.platform.seedance'),
    happyhorse: t('enum.platform.happyhorse'),
  };

  return map[platform];
}

function languageLabel(language: PromptLanguage) {
  const map: Record<PromptLanguage, string> = {
    zh: t('enum.promptLanguage.zh'),
    en: t('enum.promptLanguage.en'),
    bilingual: t('enum.promptLanguage.bilingual'),
  };

  return map[language];
}

function statusLabel(status: AnalysisStatus) {
  const map: Record<AnalysisStatus, string> = {
    PENDING: t('enum.analysisStatus.PENDING'),
    EXTRACTING: t('enum.analysisStatus.EXTRACTING'),
    ANALYZING: t('enum.analysisStatus.ANALYZING'),
    DONE: t('enum.analysisStatus.DONE'),
    FAILED: t('enum.analysisStatus.FAILED'),
  };

  return map[status];
}

async function fetchHistory() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const data = await getAnalysisHistoryRequest({
      page: page.value,
      limit: limit.value,
    });

    items.value = data.items;
    total.value = data.total;
    totalPages.value = data.totalPages;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      errorMessage.value =
        (error.response?.data as { message?: string })?.message ?? t('history.errors.fetchFailed');
    } else {
      errorMessage.value = t('history.errors.fetchFailed');
    }
  } finally {
    loading.value = false;
  }
}

function changePage(nextPage: number) {
  if (nextPage < 1 || (totalPages.value > 0 && nextPage > totalPages.value)) {
    return;
  }

  page.value = nextPage;
  void fetchHistory();
}

function goResult(analysisId: string) {
  void router.push(`/result/${analysisId}`);
}

async function removeItem(analysisId: string) {
  const confirmed = window.confirm(t('history.deleteConfirm'));
  if (!confirmed) {
    return;
  }

  deletingId.value = analysisId;
  errorMessage.value = '';

  try {
    await deleteAnalysisRequest(analysisId);

    if (items.value.length === 1 && page.value > 1) {
      page.value -= 1;
    }

    await fetchHistory();
  } catch (error) {
    if (axios.isAxiosError(error)) {
      errorMessage.value =
        (error.response?.data as { message?: string })?.message ?? t('history.errors.deleteFailed');
    } else {
      errorMessage.value = t('history.errors.deleteFailed');
    }
  } finally {
    deletingId.value = '';
  }
}

onMounted(() => {
  void fetchHistory();
});
</script>
