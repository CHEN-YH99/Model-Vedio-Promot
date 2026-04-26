<template>
  <section class="space-y-6">
    <header
      class="overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.2),_transparent_42%),linear-gradient(135deg,_rgba(255,255,255,0.08),_rgba(255,255,255,0.03))] p-5 sm:p-6"
    >
      <p class="text-xs uppercase tracking-[0.24em] text-cyan-200/80">Shared Result</p>
      <h1 class="mt-2 text-2xl font-semibold text-white sm:text-3xl">公开分享结果</h1>
      <p class="mt-2 text-sm text-zinc-300">token: {{ token }}</p>
      <p v-if="expiresAtText" class="mt-1 text-sm text-zinc-300">有效期至：{{ expiresAtText }}</p>
    </header>

    <div
      v-if="loading"
      class="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-zinc-300"
    >
      正在加载分享内容...
    </div>

    <p
      v-else-if="errorMessage"
      class="rounded-lg border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-sm text-rose-200"
    >
      {{ errorMessage }}
    </p>

    <div v-else-if="result" class="space-y-5">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="platform in platformTabs"
          :key="platform"
          class="rounded-full border px-4 py-2 text-sm transition"
          :class="
            platform === selectedPlatform
              ? 'border-cyan-400 bg-cyan-400/15 text-cyan-100 shadow-[0_0_0_1px_rgba(56,189,248,0.25)]'
              : 'border-white/15 bg-white/5 text-zinc-300 hover:border-white/40 hover:text-white'
          "
          @click="selectedPlatform = platform"
        >
          {{ platformLabel(platform) }}
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <p class="text-xs uppercase tracking-[0.24em] text-zinc-500">语言</p>
        <button
          v-for="language in languageTabs"
          :key="language"
          class="rounded-full border px-4 py-2 text-sm transition"
          :class="
            language === selectedLanguage
              ? 'border-cyan-400 bg-cyan-400/15 text-cyan-100 shadow-[0_0_0_1px_rgba(56,189,248,0.25)]'
              : 'border-white/15 bg-white/5 text-zinc-300 hover:border-white/40 hover:text-white'
          "
          @click="selectedLanguage = language"
        >
          {{ languageLabel(language) }}
        </button>
      </div>

      <div class="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <aside class="rounded-[28px] border border-white/10 bg-white/5 p-4 sm:p-5">
          <p class="text-xs uppercase tracking-[0.24em] text-zinc-500">Timeline</p>
          <h3 class="mt-1 text-lg font-semibold text-white">关键帧时间轴</h3>
          <div class="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
            <button
              v-for="(frame, index) in result.frames"
              :key="frame.id"
              class="min-w-[13rem] snap-start rounded-[20px] border p-2 text-left transition"
              :class="
                index === selectedFrameIndex
                  ? 'border-cyan-400 bg-cyan-400/12 shadow-[0_0_0_1px_rgba(56,189,248,0.25)]'
                  : 'border-white/10 bg-zinc-950/45 hover:border-white/30 hover:bg-white/5'
              "
              @click="selectedFrameIndex = index"
            >
              <img
                :src="toImageUrl(frame.thumbUrl)"
                alt="关键帧缩略图"
                class="aspect-video w-full rounded-[14px] object-cover"
              />
              <p class="mt-3 text-sm font-medium text-white">{{ formatTimestamp(frame.timestamp) }}</p>
              <p class="mt-1 line-clamp-2 text-xs leading-5 text-zinc-400">
                {{ frame.rawAnalysis.scene || frame.rawAnalysis.subject || '暂无描述' }}
              </p>
            </button>
          </div>
        </aside>

        <main class="space-y-5">
          <section class="rounded-[28px] border border-cyan-300/20 bg-cyan-400/[0.08] p-5 sm:p-6">
            <h3 class="text-xl font-semibold text-white">整体提示词</h3>
            <p class="mt-4 whitespace-pre-wrap text-sm leading-7 text-zinc-100">{{ overallPromptText }}</p>
          </section>

          <section class="rounded-[28px] border border-white/10 bg-white/5 p-5 sm:p-6">
            <h3 class="text-xl font-semibold text-white">当前帧提示词</h3>
            <p class="mt-2 text-sm text-zinc-300">{{ selectedFrameMeta }}</p>
            <p class="mt-4 whitespace-pre-wrap text-sm leading-7 text-zinc-100">{{ currentFramePrompt }}</p>
          </section>

          <section class="rounded-[28px] border border-white/10 bg-white/5 p-5 sm:p-6">
            <p class="text-xs uppercase tracking-[0.24em] text-zinc-500">Style Tags</p>
            <h3 class="mt-2 text-xl font-semibold text-white">风格标签</h3>
            <div class="mt-4 flex flex-wrap gap-2">
              <span
                v-for="tag in result.styleTags"
                :key="tag"
                class="rounded-full border border-white/15 bg-black/20 px-3 py-2 text-xs text-zinc-100"
              >
                {{ tag }}
              </span>
            </div>
          </section>
        </main>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import axios from 'axios';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { apiBaseUrl } from '@/api/http';
import { getSharedAnalysisResultRequest } from '@/api/share';
import type {
  PlatformPromptContent,
  PromptLanguage,
  PromptPayload,
  PromptPlatform,
  SharedAnalysisResultResponse,
} from '@/types/analysis';

const route = useRoute();
const token = String(route.params.token ?? '');

const loading = ref(true);
const errorMessage = ref('');
const result = ref<SharedAnalysisResultResponse | null>(null);
const selectedFrameIndex = ref(0);
const selectedPlatform = ref<PromptPlatform>('sora');
const selectedLanguage = ref<PromptLanguage>('zh');

const languageTabs: PromptLanguage[] = ['zh', 'en', 'bilingual'];

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

function isPromptContent(payload: PromptPayload | undefined): payload is PlatformPromptContent {
  return Boolean(payload && typeof payload === 'object' && 'prompt' in payload);
}

function resolvePromptText(payload: PromptPayload | undefined, fallback: string) {
  if (!payload) {
    return fallback;
  }

  if (typeof payload === 'string') {
    return payload;
  }

  if (isPromptContent(payload)) {
    return payload.prompt[selectedLanguage.value] ?? fallback;
  }

  return fallback;
}

const currentFramePrompt = computed(() => {
  const frame = currentFrame.value;
  if (!frame) {
    return '';
  }

  return resolvePromptText(frame.prompts[selectedPlatform.value], '当前平台暂无提示词');
});

const overallPromptText = computed(() => {
  const promptMap = result.value?.overallPrompt;
  if (!promptMap) {
    return '暂无整体提示词';
  }

  return resolvePromptText(promptMap[selectedPlatform.value], '当前平台暂无整体提示词');
});

const selectedFrameMeta = computed(() => {
  const frame = currentFrame.value;
  const total = result.value?.frames.length ?? 0;

  if (!frame) {
    return '未选中';
  }

  return `${formatTimestamp(frame.timestamp)} · ${selectedFrameIndex.value + 1}/${total}`;
});

const expiresAtText = computed(() => {
  const value = result.value?.expiresAt;
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('zh-CN', { hour12: false });
});

function normalizeLanguage(value: unknown): PromptLanguage {
  if (value === 'zh' || value === 'en' || value === 'bilingual') {
    return value;
  }

  return 'zh';
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

function formatTimestamp(value: number) {
  const totalSeconds = Math.max(0, Math.floor(value));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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

async function fetchResult() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const data = await getSharedAnalysisResultRequest(token);
    result.value = data;
    selectedPlatform.value = data.config.platforms[0] ?? 'sora';
    selectedLanguage.value = normalizeLanguage(data.config.language);
    selectedFrameIndex.value = 0;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      errorMessage.value =
        (error.response?.data as { message?: string })?.message ?? '读取分享内容失败';
    } else {
      errorMessage.value = '读取分享内容失败';
    }
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void fetchResult();
});
</script>
