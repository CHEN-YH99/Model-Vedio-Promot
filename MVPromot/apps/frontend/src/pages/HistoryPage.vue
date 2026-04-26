<template>
  <section class="vtp-page px-0 py-10">
    <div class="vtp-panel rounded-[2rem] p-6 md:p-10">
      <p class="vtp-kicker">History</p>
      <h1 class="vtp-title mt-4 max-w-[12ch]">历史分析记录</h1>
      <p class="vtp-body mt-4 max-w-3xl">
        按创建时间倒序展示分析结果，支持快速回看和删除记录。
      </p>
    </div>

    <div class="mt-6 space-y-4">
      <div
        v-if="loading"
        class="vtp-panel rounded-[1.5rem] p-6 text-sm text-slate-300"
      >
        正在加载历史记录...
      </div>

      <p
        v-else-if="errorMessage"
        class="rounded-lg border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-sm text-rose-200"
      >
        {{ errorMessage }}
      </p>

      <div v-else-if="items.length === 0" class="vtp-panel rounded-[1.5rem] p-6 text-sm text-slate-300">
        暂无历史记录，先去分析一个视频吧。
      </div>

      <article
        v-for="item in items"
        :key="item.analysisId"
        class="vtp-panel grid gap-4 rounded-[1.75rem] p-5 md:grid-cols-[220px_1fr_auto] md:items-center"
      >
        <div class="overflow-hidden rounded-[1.25rem] border border-white/10 bg-white/5">
          <img
            v-if="item.coverThumbUrl"
            :src="toImageUrl(item.coverThumbUrl)"
            alt="分析封面"
            class="aspect-video w-full object-cover"
          />
          <div v-else class="flex aspect-video items-center justify-center text-xs text-slate-400">
            无关键帧封面
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
            创建时间：{{ formatDate(item.createdAt) }} · 帧数：{{ item.frameCount }} · 语言：{{ languageLabel(item.language) }}
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
          <button class="vtp-button" @click="goResult(item.analysisId)">查看结果</button>
          <button
            class="vtp-button vtp-button--ghost"
            :disabled="deletingId === item.analysisId"
            @click="removeItem(item.analysisId)"
          >
            {{ deletingId === item.analysisId ? '删除中...' : '删除' }}
          </button>
        </div>
      </article>

      <div v-if="totalPages > 1" class="vtp-panel flex items-center justify-between rounded-[1.5rem] p-4">
        <p class="text-sm text-slate-300">
          第 {{ page }} / {{ totalPages }} 页（共 {{ total }} 条）
        </p>
        <div class="flex gap-2">
          <button class="vtp-button vtp-button--ghost" :disabled="page <= 1" @click="changePage(page - 1)">
            上一页
          </button>
          <button
            class="vtp-button vtp-button--ghost"
            :disabled="page >= totalPages"
            @click="changePage(page + 1)"
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import axios from 'axios';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { deleteAnalysisRequest, getAnalysisHistoryRequest } from '@/api/analysis';
import { apiBaseUrl } from '@/api/http';
import type { AnalysisHistoryItem, AnalysisStatus, PromptLanguage, PromptPlatform } from '@/types/analysis';

const router = useRouter();

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

  return parsed.toLocaleString('zh-CN', { hour12: false });
}

function platformSummary(platforms: PromptPlatform[]) {
  if (platforms.length === 0) {
    return '未记录平台';
  }

  return platforms.map((item) => platformLabel(item)).join(' / ');
}

function platformLabel(platform: PromptPlatform) {
  const map: Record<PromptPlatform, string> = {
    sora: 'Sora',
    runway: 'Runway',
    kling: '可灵',
    pika: 'Pika',
    wan: '万象',
    hailuo: '海螺',
  };

  return map[platform];
}

function languageLabel(language: PromptLanguage) {
  const map: Record<PromptLanguage, string> = {
    zh: '中文',
    en: '英文',
    bilingual: '双语',
  };

  return map[language];
}

function statusLabel(status: AnalysisStatus) {
  const map: Record<AnalysisStatus, string> = {
    PENDING: '排队中',
    EXTRACTING: '提帧中',
    ANALYZING: '分析中',
    DONE: '已完成',
    FAILED: '失败',
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
        (error.response?.data as { message?: string })?.message ?? '读取历史记录失败';
    } else {
      errorMessage.value = '读取历史记录失败';
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
  const confirmed = window.confirm('确认删除这条分析记录？删除后不可恢复。');
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
        (error.response?.data as { message?: string })?.message ?? '删除记录失败';
    } else {
      errorMessage.value = '删除记录失败';
    }
  } finally {
    deletingId.value = '';
  }
}

onMounted(() => {
  void fetchHistory();
});
</script>
