<template>
  <section class="space-y-6">
    <header class="rounded-2xl border border-white/10 bg-white/5 p-5">
      <h1 class="text-2xl font-semibold text-white">分析结果</h1>
      <p class="mt-2 text-sm text-zinc-300">analysisId: {{ analysisId }}</p>
      <p class="mt-1 text-sm text-zinc-300">状态：{{ result?.status ?? '加载中' }}</p>
    </header>

    <div
      v-if="loading"
      class="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-zinc-300"
    >
      正在加载分析结果...
    </div>

    <p
      v-else-if="errorMessage"
      class="rounded-lg border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-sm text-rose-200"
    >
      {{ errorMessage }}
    </p>

    <div v-else-if="result" class="grid gap-5 xl:grid-cols-[320px_1fr]">
      <aside class="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 class="text-sm font-semibold uppercase tracking-wider text-zinc-300">关键帧</h2>
        <div class="mt-3 space-y-2">
          <button
            v-for="(frame, index) in result.frames"
            :key="frame.id"
            class="w-full rounded-lg border border-white/10 p-2 text-left transition"
            :class="
              index === selectedFrameIndex
                ? 'border-emerald-400 bg-emerald-400/10'
                : 'bg-zinc-900/40 hover:border-white/30'
            "
            @click="selectedFrameIndex = index"
          >
            <img
              :src="toImageUrl(frame.thumbUrl)"
              alt="关键帧"
              class="h-24 w-full rounded-md object-cover"
            />
            <p class="mt-2 text-xs text-zinc-300">{{ frame.timestamp.toFixed(2) }}s</p>
          </button>
        </div>
      </aside>

      <main class="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="platform in platformTabs"
            :key="platform"
            class="rounded-md border px-3 py-1 text-sm transition"
            :class="
              platform === selectedPlatform
                ? 'border-emerald-400 bg-emerald-400/10 text-emerald-200'
                : 'border-white/20 text-zinc-300 hover:border-white/40'
            "
            @click="selectedPlatform = platform"
          >
            {{ platformLabel(platform) }}
          </button>
        </div>

        <section class="space-y-2 rounded-xl border border-white/10 bg-zinc-950/40 p-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-zinc-200">整体提示词</h3>
            <button
              class="rounded border border-white/20 px-2 py-1 text-xs text-zinc-300 hover:border-emerald-300 hover:text-emerald-200"
              @click="copyText(overallPromptText)"
            >
              复制
            </button>
          </div>
          <p class="whitespace-pre-wrap text-sm text-zinc-200">{{ overallPromptText }}</p>
          <p class="text-xs text-zinc-400">字符数：{{ overallPromptText.length }}</p>
        </section>

        <section class="space-y-2 rounded-xl border border-white/10 bg-zinc-950/40 p-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-zinc-200">当前帧提示词</h3>
            <button
              class="rounded border border-white/20 px-2 py-1 text-xs text-zinc-300 hover:border-emerald-300 hover:text-emerald-200"
              @click="copyText(currentFramePrompt)"
            >
              复制
            </button>
          </div>
          <p class="whitespace-pre-wrap text-sm text-zinc-200">{{ currentFramePrompt }}</p>
          <p class="text-xs text-zinc-400">字符数：{{ currentFramePrompt.length }}</p>
        </section>

        <section class="space-y-2 rounded-xl border border-white/10 bg-zinc-950/40 p-4">
          <h3 class="text-sm font-semibold text-zinc-200">风格标签</h3>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="tag in result.styleTags"
              :key="tag"
              class="rounded-full border border-white/20 px-3 py-1 text-xs text-zinc-200"
            >
              {{ tag }}
            </span>
          </div>
        </section>
      </main>
    </div>
  </section>
</template>

<script setup lang="ts">
import axios from 'axios';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { getAnalysisResultRequest } from '@/api/analysis';
import { apiBaseUrl } from '@/api/http';
import type { AnalysisResultResponse, PromptPlatform } from '@/types/analysis';

const route = useRoute();
const analysisId = String(route.params.analysisId ?? '');

const loading = ref(true);
const errorMessage = ref('');
const result = ref<AnalysisResultResponse | null>(null);
const selectedFrameIndex = ref(0);
const selectedPlatform = ref<PromptPlatform>('sora');

const platformTabs = computed<PromptPlatform[]>(() => {
  const source = result.value;
  if (!source) {
    return ['sora'];
  }

  if (source.config.platforms.length > 0) {
    return source.config.platforms;
  }

  const firstFrame = source.frames[0];
  if (!firstFrame) {
    return ['sora'];
  }

  return Object.keys(firstFrame.prompts) as PromptPlatform[];
});

const currentFrame = computed(() => result.value?.frames[selectedFrameIndex.value] ?? null);

const currentFramePrompt = computed(() => {
  const frame = currentFrame.value;
  if (!frame) {
    return '';
  }

  return frame.prompts[selectedPlatform.value] ?? '当前平台暂无提示词';
});

const overallPromptText = computed(() => {
  const promptMap = result.value?.overallPrompt;
  if (!promptMap) {
    return '暂无整体提示词';
  }

  return promptMap[selectedPlatform.value] ?? '当前平台暂无整体提示词';
});

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

function fallbackCopyText(content: string) {
  const textarea = document.createElement('textarea');
  textarea.value = content;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    return document.execCommand('copy');
  } finally {
    document.body.removeChild(textarea);
  }
}

async function copyText(content: string) {
  if (!content) {
    return;
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(content);
      return;
    }

    if (!fallbackCopyText(content)) {
      throw new Error('copy-failed');
    }
  } catch {
    if (!fallbackCopyText(content)) {
      errorMessage.value = '复制失败，请手动复制';
    }
  }
}

async function fetchResult() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const data = await getAnalysisResultRequest(analysisId);
    result.value = data;

    const firstPlatform = data.config.platforms[0] ?? 'sora';
    selectedPlatform.value = firstPlatform;
    selectedFrameIndex.value = 0;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      errorMessage.value =
        (error.response?.data as { message?: string })?.message ?? '读取分析结果失败';
    } else {
      errorMessage.value = '读取分析结果失败';
    }
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void fetchResult();
});
</script>
