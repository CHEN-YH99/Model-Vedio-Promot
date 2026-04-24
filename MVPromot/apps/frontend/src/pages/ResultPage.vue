<template>
  <section class="space-y-6">
    <header
      class="overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_38%),linear-gradient(135deg,_rgba(255,255,255,0.08),_rgba(255,255,255,0.03))] p-5 sm:p-6"
    >
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-xs uppercase tracking-[0.24em] text-emerald-200/75">Video Prompt Lab</p>
          <h1 class="mt-2 text-2xl font-semibold text-white sm:text-3xl">分析结果</h1>
          <p class="mt-2 text-sm text-zinc-300">analysisId: {{ analysisId }}</p>
          <p class="mt-1 text-sm text-zinc-300">状态：{{ result?.status ?? '加载中' }}</p>
        </div>

        <div class="grid gap-3 sm:grid-cols-3">
          <div class="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <p class="text-xs uppercase tracking-[0.2em] text-zinc-400">关键帧数</p>
            <p class="mt-2 text-lg font-semibold text-white">{{ result?.frames.length ?? 0 }}</p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <p class="text-xs uppercase tracking-[0.2em] text-zinc-400">当前平台</p>
            <p class="mt-2 text-lg font-semibold text-white">{{ platformLabel(selectedPlatform) }}</p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <p class="text-xs uppercase tracking-[0.2em] text-zinc-400">当前帧</p>
            <p class="mt-2 text-lg font-semibold text-white">{{ selectedFrameMeta }}</p>
          </div>
        </div>
      </div>
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

    <div v-else-if="result" class="space-y-6">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="platform in platformTabs"
          :key="platform"
          class="rounded-full border px-4 py-2 text-sm transition"
          :class="
            platform === selectedPlatform
              ? 'border-emerald-400 bg-emerald-400/15 text-emerald-100 shadow-[0_0_0_1px_rgba(16,185,129,0.25)]'
              : 'border-white/15 bg-white/5 text-zinc-300 hover:border-white/40 hover:text-white'
          "
          @click="selectedPlatform = platform"
        >
          {{ platformLabel(platform) }}
        </button>
      </div>

      <div class="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.18fr)]">
        <aside class="space-y-5">
          <section class="overflow-hidden rounded-[28px] border border-white/10 bg-white/5">
            <div class="relative aspect-video bg-zinc-950/70">
              <img
                v-if="currentFrame"
                :src="toImageUrl(currentFrame.thumbUrl)"
                alt="当前选中关键帧"
                class="absolute inset-0 h-full w-full object-cover"
              />
              <div
                class="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,9,11,0.05)_0%,rgba(9,9,11,0.24)_48%,rgba(9,9,11,0.84)_100%)]"
              ></div>

              <div class="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-4 sm:p-5">
                <div>
                  <p class="text-xs uppercase tracking-[0.24em] text-emerald-200/80">Selected Frame</p>
                  <h2 class="mt-2 text-lg font-semibold text-white sm:text-xl">
                    {{ currentFrameHeadline }}
                  </h2>
                  <p class="mt-1 text-sm text-zinc-200/80">{{ currentFrameScene }}</p>
                </div>

                <div class="rounded-full border border-white/15 bg-black/35 px-3 py-1 text-sm text-white">
                  {{ selectedFrameMeta }}
                </div>
              </div>
            </div>

            <div class="grid gap-3 p-4 sm:grid-cols-2">
              <article
                v-for="item in currentFrameFacts"
                :key="item.label"
                class="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
              >
                <p class="text-xs uppercase tracking-[0.2em] text-zinc-500">{{ item.label }}</p>
                <p class="mt-2 text-sm leading-6 text-zinc-100">{{ item.value }}</p>
              </article>
            </div>
          </section>

          <section class="rounded-[28px] border border-white/10 bg-white/5 p-4 sm:p-5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p class="text-xs uppercase tracking-[0.24em] text-zinc-500">Timeline</p>
                <h3 class="mt-1 text-lg font-semibold text-white">关键帧时间轴</h3>
              </div>
              <p class="text-sm text-zinc-400">点击切换当前帧提示词</p>
            </div>

            <div class="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
              <button
                v-for="(frame, index) in result.frames"
                :key="frame.id"
                class="group min-w-[13rem] snap-start rounded-[22px] border p-2 text-left transition sm:min-w-[14rem]"
                :class="
                  index === selectedFrameIndex
                    ? 'border-emerald-400 bg-emerald-400/12 shadow-[0_0_0_1px_rgba(16,185,129,0.22)]'
                    : 'border-white/10 bg-zinc-950/45 hover:border-white/30 hover:bg-white/5'
                "
                @click="selectedFrameIndex = index"
              >
                <div class="overflow-hidden rounded-[16px]">
                  <img
                    :src="toImageUrl(frame.thumbUrl)"
                    alt="关键帧缩略图"
                    class="aspect-video w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                </div>

                <div class="mt-3 flex items-center justify-between gap-2">
                  <p class="text-sm font-medium text-white">{{ formatTimestamp(frame.timestamp) }}</p>
                  <span
                    class="rounded-full border px-2 py-1 text-[11px]"
                    :class="
                      index === selectedFrameIndex
                        ? 'border-emerald-300/50 text-emerald-100'
                        : 'border-white/10 text-zinc-400'
                    "
                  >
                    帧 {{ index + 1 }}
                  </span>
                </div>

                <p class="mt-2 line-clamp-2 text-xs leading-5 text-zinc-400">
                  {{ frame.rawAnalysis.scene || frame.rawAnalysis.subject || '暂无场景描述' }}
                </p>
              </button>
            </div>
          </section>
        </aside>

        <main class="space-y-5">
          <section class="rounded-[28px] border border-emerald-300/15 bg-emerald-400/[0.07] p-5 sm:p-6">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="text-xs uppercase tracking-[0.24em] text-emerald-200/75">Overall Prompt</p>
                <h3 class="mt-2 text-xl font-semibold text-white">整体视频提示词</h3>
                <p class="mt-2 text-sm text-zinc-300">
                  这是基于整段视频多帧汇总后的专业提示词，不跟单帧一起复读。
                </p>
              </div>
              <button
                class="rounded-full border border-white/15 bg-black/20 px-3 py-2 text-xs text-zinc-200 transition hover:border-emerald-300 hover:text-emerald-100"
                @click="copyText(overallPromptText)"
              >
                复制整体提示词
              </button>
            </div>

            <div class="mt-5 rounded-[24px] border border-white/10 bg-black/25 p-4 sm:p-5">
              <p class="whitespace-pre-wrap text-sm leading-7 text-zinc-100">{{ overallPromptText }}</p>
            </div>
            <p class="mt-3 text-xs text-zinc-400">字符数：{{ overallPromptText.length }}</p>
          </section>

          <section class="rounded-[28px] border border-white/10 bg-white/5 p-5 sm:p-6">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="text-xs uppercase tracking-[0.24em] text-zinc-500">Frame Prompt</p>
                <h3 class="mt-2 text-xl font-semibold text-white">当前帧提示词</h3>
                <p class="mt-2 text-sm text-zinc-300">
                  当前显示 {{ selectedFrameMeta }}，切换左侧时间轴会同步更新这里。
                </p>
              </div>
              <button
                class="rounded-full border border-white/15 bg-black/20 px-3 py-2 text-xs text-zinc-200 transition hover:border-emerald-300 hover:text-emerald-100"
                @click="copyText(currentFramePrompt)"
              >
                复制当前帧提示词
              </button>
            </div>

            <div class="mt-5 rounded-[24px] border border-white/10 bg-black/25 p-4 sm:p-5">
              <p class="whitespace-pre-wrap text-sm leading-7 text-zinc-100">{{ currentFramePrompt }}</p>
            </div>
            <p class="mt-3 text-xs text-zinc-400">字符数：{{ currentFramePrompt.length }}</p>
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

const currentFrameHeadline = computed(() => {
  const frame = currentFrame.value;
  if (!frame) {
    return '未选中关键帧';
  }

  return frame.rawAnalysis.subject || '当前帧主体待补充';
});

const currentFrameScene = computed(() => {
  const frame = currentFrame.value;
  if (!frame) {
    return '暂无场景信息';
  }

  return frame.rawAnalysis.scene || '暂无场景信息';
});

const currentFrameFacts = computed(() => {
  const frame = currentFrame.value;
  const rawAnalysis = frame?.rawAnalysis ?? {};

  return [
    {
      label: '主体',
      value: rawAnalysis.subject || '暂无主体信息',
    },
    {
      label: '场景',
      value: rawAnalysis.scene || '暂无场景信息',
    },
    {
      label: '风格 / 情绪',
      value: [rawAnalysis.style, rawAnalysis.mood].filter(Boolean).join(' / ') || '暂无风格信息',
    },
    {
      label: '镜头语言',
      value:
        [rawAnalysis.cameraAngle, rawAnalysis.cameraMovement].filter(Boolean).join(' / ') ||
        '暂无镜头信息',
    },
  ];
});

const selectedFrameMeta = computed(() => {
  const frame = currentFrame.value;
  const total = result.value?.frames.length ?? 0;

  if (!frame) {
    return '未选中';
  }

  return `${formatTimestamp(frame.timestamp)} · ${selectedFrameIndex.value + 1}/${total}`;
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
