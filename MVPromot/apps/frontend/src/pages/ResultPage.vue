<template>
  <section class="vtp-page px-0 py-6 sm:py-8 lg:py-10 space-y-6">
    <header
      class="overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_38%),linear-gradient(135deg,_rgba(255,255,255,0.08),_rgba(255,255,255,0.03))] p-5 sm:p-6"
    >
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-xs uppercase tracking-[0.24em] text-emerald-200/75">Video Prompt Lab</p>
          <h1 class="mt-2 text-2xl font-semibold text-white sm:text-3xl">{{ t('result.title') }}</h1>
          <p class="mt-2 text-sm text-zinc-300">analysisId: {{ analysisId }}</p>
          <p class="mt-1 text-sm text-zinc-300">
            {{ t('result.status', { status: result?.status ?? t('common.loading') }) }}
          </p>
        </div>

        <div class="grid gap-3 sm:grid-cols-3">
          <div class="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <p class="text-xs uppercase tracking-[0.2em] text-zinc-400">{{ t('result.keyFrameCount') }}</p>
            <p class="mt-2 text-lg font-semibold text-white">{{ result?.frames.length ?? 0 }}</p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <p class="text-xs uppercase tracking-[0.2em] text-zinc-400">{{ t('result.currentPlatform') }}</p>
            <p class="mt-2 text-lg font-semibold text-white">{{ platformLabel(selectedPlatform) }}</p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <p class="text-xs uppercase tracking-[0.2em] text-zinc-400">{{ t('result.currentFrame') }}</p>
            <p class="mt-2 text-lg font-semibold text-white">{{ selectedFrameMeta }}</p>
          </div>
        </div>
      </div>
    </header>

    <div
      v-if="loading"
      class="space-y-5"
    >
      <div class="h-10 w-44 animate-pulse rounded-xl bg-white/8"></div>
      <div class="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.18fr)]">
        <div class="space-y-5">
          <div class="rounded-[28px] border border-white/10 bg-white/5 p-4">
            <div class="aspect-video animate-pulse rounded-2xl bg-white/8"></div>
            <div class="mt-4 grid gap-3 sm:grid-cols-2">
              <div class="h-20 rounded-2xl bg-white/8"></div>
              <div class="h-20 rounded-2xl bg-white/8"></div>
            </div>
          </div>
          <div class="rounded-[28px] border border-white/10 bg-white/5 p-4">
            <div class="h-5 w-36 animate-pulse rounded bg-white/8"></div>
            <div class="mt-4 h-24 animate-pulse rounded-2xl bg-white/8"></div>
          </div>
        </div>
        <div class="space-y-5">
          <div class="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div class="h-5 w-40 animate-pulse rounded bg-white/8"></div>
            <div class="mt-4 h-4 w-full animate-pulse rounded bg-white/8"></div>
            <div class="mt-2 h-4 w-5/6 animate-pulse rounded bg-white/8"></div>
          </div>
          <div class="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div class="h-5 w-40 animate-pulse rounded bg-white/8"></div>
            <div class="mt-4 h-4 w-full animate-pulse rounded bg-white/8"></div>
            <div class="mt-2 h-4 w-3/4 animate-pulse rounded bg-white/8"></div>
          </div>
        </div>
      </div>
    </div>

    <p
      v-else-if="errorMessage"
      class="rounded-lg border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-sm text-rose-200"
    >
      {{ errorMessage }}
    </p>

    <div v-else-if="result" class="space-y-6">
      <p
        v-if="actionErrorMessage"
        class="rounded-lg border border-amber-300/40 bg-amber-300/10 px-3 py-2 text-sm text-amber-100"
      >
        {{ actionErrorMessage }}
      </p>

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

      <div class="flex flex-wrap items-center gap-2">
        <p class="text-xs uppercase tracking-[0.24em] text-zinc-500">{{ t('result.language') }}</p>
        <button
          v-for="language in languageTabs"
          :key="language"
          class="rounded-full border px-4 py-2 text-sm transition"
          :class="
            language === selectedLanguage
              ? 'border-emerald-400 bg-emerald-400/15 text-emerald-100 shadow-[0_0_0_1px_rgba(16,185,129,0.25)]'
              : 'border-white/15 bg-white/5 text-zinc-300 hover:border-white/40 hover:text-white'
          "
          @click="selectedLanguage = language"
        >
          {{ languageLabel(language) }}
        </button>
      </div>

      <div class="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.18fr)]">
        <aside class="space-y-5">
          <section
            class="overflow-hidden rounded-[28px] border border-white/10 bg-white/5"
            @touchstart.passive="handleSwipeTouchStart"
            @touchend.passive="handleSwipeTouchEnd"
          >
            <div class="relative aspect-video bg-zinc-950/70">
              <LazyImage
                v-if="currentFrame"
                :src="toImageUrl(currentFrame.thumbUrl)"
                :alt="t('result.selectedFrame')"
                image-class="absolute inset-0 h-full w-full object-cover"
                wrapper-class="relative h-full w-full overflow-hidden"
              />
              <div
                class="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,9,11,0.05)_0%,rgba(9,9,11,0.24)_48%,rgba(9,9,11,0.84)_100%)]"
              ></div>

              <div class="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-4 sm:p-5">
                <div>
                  <p class="text-xs uppercase tracking-[0.24em] text-emerald-200/80">{{ t('result.selectedFrame') }}</p>
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
                <p class="text-xs uppercase tracking-[0.24em] text-zinc-500">{{ t('result.timeline.title') }}</p>
                <h3 class="mt-1 text-lg font-semibold text-white">{{ t('result.timeline.title') }}</h3>
              </div>
              <div class="flex items-center gap-2">
                <p class="text-sm text-zinc-400">{{ t('result.timeline.hint') }}</p>
                <div class="hidden items-center gap-2 sm:flex">
                  <button
                    type="button"
                    class="rounded-full border border-white/15 bg-black/20 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                    :disabled="selectedFrameIndex <= 0"
                    @click="selectFrameByOffset(-1)"
                  >
                    {{ t('result.timeline.previousFrame') }}
                  </button>
                  <button
                    type="button"
                    class="rounded-full border border-white/15 bg-black/20 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                    :disabled="selectedFrameIndex >= (result?.frames.length ?? 1) - 1"
                    @click="selectFrameByOffset(1)"
                  >
                    {{ t('result.timeline.nextFrame') }}
                  </button>
                </div>
              </div>
            </div>

            <div
              ref="timelineRef"
              class="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
              @touchstart.passive="handleSwipeTouchStart"
              @touchend.passive="handleSwipeTouchEnd"
            >
              <button
                v-for="(frame, index) in result.frames"
                :key="frame.id"
                class="group min-w-[13rem] snap-start rounded-[22px] border p-2 text-left transition sm:min-w-[14rem]"
                :class="
                  index === selectedFrameIndex
                    ? 'border-emerald-400 bg-emerald-400/12 shadow-[0_0_0_1px_rgba(16,185,129,0.22)]'
                    : 'border-white/10 bg-zinc-950/45 hover:border-white/30 hover:bg-white/5'
                "
                :data-frame-active="index === selectedFrameIndex ? 'true' : 'false'"
                @click="selectFrameByIndex(index)"
              >
                <div class="overflow-hidden rounded-[16px]">
                  <LazyImage
                    :src="toImageUrl(frame.thumbUrl)"
                    :alt="t('result.timeline.title')"
                    image-class="aspect-video w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    wrapper-class="relative overflow-hidden rounded-[16px]"
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
                    {{ t('result.timeline.frameLabel', { index: index + 1 }) }}
                  </span>
                </div>

                <p class="mt-2 line-clamp-2 text-xs leading-5 text-zinc-400">
                  {{ frame.rawAnalysis.scene || frame.rawAnalysis.subject || t('result.fallback.noSceneDesc') }}
                </p>
              </button>
            </div>
          </section>
        </aside>

        <main class="space-y-5">
          <section class="rounded-[28px] border border-emerald-300/15 bg-emerald-400/[0.07] p-5 sm:p-6">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="text-xs uppercase tracking-[0.24em] text-emerald-200/75">{{ t('result.overallPrompt.kicker') }}</p>
                <h3 class="mt-2 text-xl font-semibold text-white">{{ t('result.overallPrompt.title') }}</h3>
                <p class="mt-2 text-sm text-zinc-300">
                  {{ t('result.overallPrompt.desc') }}
                </p>
              </div>
              <div class="flex flex-wrap gap-2">
                <button
                  class="rounded-full border border-white/15 bg-black/20 px-3 py-2 text-xs text-zinc-200 transition hover:border-emerald-300 hover:text-emerald-100"
                  @click="copyText(overallPromptText)"
                >
                  {{ t('result.overallPrompt.copy') }}
                </button>
                <button
                  class="rounded-full border border-white/15 bg-black/20 px-3 py-2 text-xs text-zinc-200 transition hover:border-emerald-300 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="exporting"
                  @click="exportPrompt('txt')"
                >
                  {{ exporting ? t('result.overallPrompt.exporting') : t('result.overallPrompt.exportTxt') }}
                </button>
                <button
                  class="rounded-full border border-white/15 bg-black/20 px-3 py-2 text-xs text-zinc-200 transition hover:border-emerald-300 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="exporting"
                  @click="exportPrompt('json')"
                >
                  {{ exporting ? t('result.overallPrompt.exporting') : t('result.overallPrompt.exportJson') }}
                </button>
                <button
                  class="rounded-full border border-white/15 bg-black/20 px-3 py-2 text-xs text-zinc-200 transition hover:border-emerald-300 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="sharing"
                  @click="createShareLink"
                >
                  {{ sharing ? t('result.overallPrompt.creatingShare') : t('result.overallPrompt.createShare') }}
                </button>
              </div>
            </div>

            <div class="mt-5 rounded-[24px] border border-white/10 bg-black/25 p-4 sm:p-5">
              <p class="whitespace-pre-wrap text-sm leading-7 text-zinc-100">{{ overallPromptText }}</p>
            </div>
            <p class="mt-3 text-xs text-zinc-400">{{ t('common.chars', { count: overallPromptText.length }) }}</p>
            <p v-if="shareUrl" class="mt-2 text-xs text-emerald-200/85">
              {{ t('result.overallPrompt.shareLink', { url: shareUrl }) }}
            </p>
            <p v-if="shareExpiresAt" class="mt-1 text-xs text-zinc-400">
              {{ t('result.overallPrompt.expiresAt', { value: shareExpiresAt }) }}
            </p>
          </section>

          <section class="rounded-[28px] border border-white/10 bg-white/5 p-5 sm:p-6">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="text-xs uppercase tracking-[0.24em] text-zinc-500">{{ t('result.framePrompt.kicker') }}</p>
                <h3 class="mt-2 text-xl font-semibold text-white">{{ t('result.framePrompt.title') }}</h3>
                <p class="mt-2 text-sm text-zinc-300">
                  {{ t('result.framePrompt.desc', { frameMeta: selectedFrameMeta }) }}
                </p>
              </div>
              <div class="flex flex-wrap gap-2">
                <button
                  class="rounded-full border border-white/15 bg-black/20 px-3 py-2 text-xs text-zinc-200 transition hover:border-emerald-300 hover:text-emerald-100"
                  @click="copyText(currentFramePrompt)"
                >
                  {{ t('result.framePrompt.copy') }}
                </button>
                <button
                  class="rounded-full border border-white/15 bg-black/20 px-3 py-2 text-xs text-zinc-200 transition hover:border-emerald-300 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="regenerating"
                  @click="regenerateCurrentFrame"
                >
                  {{ regenerating ? t('result.framePrompt.regenerating') : t('result.framePrompt.regenerate') }}
                </button>
                <button
                  v-if="!editing"
                  class="rounded-full border border-white/15 bg-black/20 px-3 py-2 text-xs text-zinc-200 transition hover:border-emerald-300 hover:text-emerald-100"
                  @click="startEdit"
                >
                  {{ t('result.framePrompt.edit') }}
                </button>
                <button
                  v-if="editing"
                  class="rounded-full border border-emerald-300/60 bg-emerald-300/10 px-3 py-2 text-xs text-emerald-100 transition hover:border-emerald-200"
                  :disabled="saving"
                  @click="saveEdit"
                >
                  {{ saving ? t('result.framePrompt.saving') : t('result.framePrompt.save') }}
                </button>
                <button
                  v-if="editing"
                  class="rounded-full border border-white/15 bg-black/20 px-3 py-2 text-xs text-zinc-200 transition hover:border-white/40 hover:text-white"
                  :disabled="saving"
                  @click="cancelEdit"
                >
                  {{ t('result.framePrompt.cancel') }}
                </button>
              </div>
            </div>

            <div class="mt-5 rounded-[24px] border border-white/10 bg-black/25 p-4 sm:p-5">
              <textarea
                v-if="editing"
                v-model="promptDraft"
                class="h-48 w-full resize-y rounded-xl border border-white/10 bg-zinc-950/80 p-3 text-sm leading-7 text-zinc-100 outline-none focus:border-emerald-300/60"
              ></textarea>
              <p v-else class="whitespace-pre-wrap text-sm leading-7 text-zinc-100">{{ currentFramePrompt }}</p>
            </div>
            <p class="mt-3 text-xs text-zinc-400">
              {{ t('common.chars', { count: editing ? promptDraft.length : currentFramePrompt.length }) }}
            </p>
          </section>

          <section
            v-if="showNegativePromptPanel"
            class="rounded-[28px] border border-rose-300/20 bg-rose-400/[0.06] p-5 sm:p-6"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="text-xs uppercase tracking-[0.24em] text-rose-200/75">{{ t('result.negativePrompt.kicker') }}</p>
                <h3 class="mt-2 text-xl font-semibold text-white">{{ t('result.negativePrompt.title') }}</h3>
                <p class="mt-2 text-sm text-zinc-300">{{ t('result.negativePrompt.desc') }}</p>
              </div>
              <button
                class="rounded-full border border-white/15 bg-black/20 px-3 py-2 text-xs text-zinc-200 transition hover:border-rose-300 hover:text-rose-100"
                @click="copyText(editing ? negativePromptDraft : currentFrameNegativePrompt)"
              >
                {{ t('result.negativePrompt.copy') }}
              </button>
            </div>

            <div class="mt-5 grid gap-4 lg:grid-cols-2">
              <article class="rounded-[24px] border border-white/10 bg-black/25 p-4 sm:p-5">
                <p class="text-xs uppercase tracking-[0.2em] text-zinc-500">{{ t('result.negativePrompt.overall') }}</p>
                <p class="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-100">
                  {{ overallNegativePromptText }}
                </p>
                <p class="mt-3 text-xs text-zinc-400">{{ t('common.chars', { count: overallNegativePromptText.length }) }}</p>
              </article>

              <article class="rounded-[24px] border border-white/10 bg-black/25 p-4 sm:p-5">
                <p class="text-xs uppercase tracking-[0.2em] text-zinc-500">{{ t('result.negativePrompt.frame') }}</p>
                <textarea
                  v-if="editing"
                  v-model="negativePromptDraft"
                  class="mt-3 h-44 w-full resize-y rounded-xl border border-white/10 bg-zinc-950/80 p-3 text-sm leading-7 text-zinc-100 outline-none focus:border-rose-300/60"
                ></textarea>
                <p v-else class="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-100">
                  {{ currentFrameNegativePrompt }}
                </p>
                <p class="mt-3 text-xs text-zinc-400">
                  {{ t('common.chars', { count: editing ? negativePromptDraft.length : currentFrameNegativePrompt.length }) }}
                </p>
              </article>
            </div>
          </section>

          <section class="rounded-[28px] border border-white/10 bg-white/5 p-5 sm:p-6">
            <p class="text-xs uppercase tracking-[0.24em] text-zinc-500">{{ t('result.styleTags.kicker') }}</p>
            <h3 class="mt-2 text-xl font-semibold text-white">{{ t('result.styleTags.title') }}</h3>
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
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import {
  createAnalysisShareRequest,
  exportAnalysisRequest,
  getAnalysisResultRequest,
  regenerateFramePromptRequest,
  updateFramePromptRequest,
} from '@/api/analysis';
import { apiBaseUrl } from '@/api/http';
import LazyImage from '@/components/LazyImage.vue';
import { resolveDateLocale } from '@/i18n';
import type {
  AnalysisExportFormat,
  AnalysisFrameMutationResponse,
  AnalysisResultResponse,
  PlatformPromptContent,
  PromptLanguage,
  PromptPayload,
  PromptPlatform,
} from '@/types/analysis';

const route = useRoute();
const { t, locale } = useI18n();
const analysisId = String(route.params.analysisId ?? '');
const languageTabs: PromptLanguage[] = ['zh', 'en', 'bilingual'];
const negativePromptPlatforms: PromptPlatform[] = ['kling', 'pika', 'wan', 'hailuo'];

const loading = ref(true);
const errorMessage = ref('');
const actionErrorMessage = ref('');
const result = ref<AnalysisResultResponse | null>(null);
const selectedFrameIndex = ref(0);
const selectedPlatform = ref<PromptPlatform>('sora');
const selectedLanguage = ref<PromptLanguage>('zh');
const editing = ref(false);
const saving = ref(false);
const regenerating = ref(false);
const exporting = ref(false);
const sharing = ref(false);
const promptDraft = ref('');
const negativePromptDraft = ref('');
const shareUrl = ref('');
const shareExpiresAt = ref('');
const timelineRef = ref<HTMLElement | null>(null);
const swipeStartX = ref<number | null>(null);
const swipeStartY = ref<number | null>(null);

const SWIPE_MIN_DISTANCE = 56;
const SWIPE_MAX_VERTICAL_DRIFT = 72;

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

function resolvePromptText(payload: PromptPayload | undefined, fallback: string): string {
  if (!payload) {
    return fallback;
  }

  if (typeof payload === 'string') {
    return payload;
  }

  return payload.prompt[selectedLanguage.value] ?? fallback;
}

function resolveNegativePromptText(payload: PromptPayload | undefined, fallback: string): string {
  if (!isPromptContent(payload)) {
    return fallback;
  }

  return payload.negativePrompt?.[selectedLanguage.value] ?? fallback;
}

const currentFramePrompt = computed(() => {
  const frame = currentFrame.value;
  if (!frame) {
    return '';
  }

  return resolvePromptText(frame.prompts[selectedPlatform.value], t('result.fallback.noPromptForPlatform'));
});

const overallPromptText = computed(() => {
  const promptMap = result.value?.overallPrompt;
  if (!promptMap) {
    return t('result.fallback.noOverallPrompt');
  }

  return resolvePromptText(promptMap[selectedPlatform.value], t('result.fallback.noOverallPromptForPlatform'));
});

const currentFrameHeadline = computed(() => {
  const frame = currentFrame.value;
  if (!frame) {
    return t('result.fallback.noFrameSelected');
  }

  return frame.rawAnalysis.subject || t('result.fallback.frameSubjectPending');
});

const currentFrameScene = computed(() => {
  const frame = currentFrame.value;
  if (!frame) {
    return t('result.fallback.noSceneInfo');
  }

  return frame.rawAnalysis.scene || t('result.fallback.noSceneInfo');
});

const currentFrameFacts = computed(() => {
  const frame = currentFrame.value;
  const rawAnalysis = frame?.rawAnalysis ?? {};

  return [
    {
      label: t('result.facts.subject'),
      value: rawAnalysis.subject || t('result.fallback.noSubjectInfo'),
    },
    {
      label: t('result.facts.scene'),
      value: rawAnalysis.scene || t('result.fallback.noSceneInfo'),
    },
    {
      label: t('result.facts.styleMood'),
      value: [rawAnalysis.style, rawAnalysis.mood].filter(Boolean).join(' / ') || t('result.fallback.noStyleInfo'),
    },
    {
      label: t('result.facts.camera'),
      value:
        [rawAnalysis.cameraAngle, rawAnalysis.cameraMovement].filter(Boolean).join(' / ') ||
        t('result.fallback.noCameraInfo'),
    },
  ];
});

const selectedFrameMeta = computed(() => {
  const frame = currentFrame.value;
  const total = result.value?.frames.length ?? 0;

  if (!frame) {
    return t('result.fallback.noFrameSelectedShort');
  }

  return `${formatTimestamp(frame.timestamp)} · ${selectedFrameIndex.value + 1}/${total}`;
});

const currentFrameNegativePrompt = computed(() => {
  const frame = currentFrame.value;
  if (!frame) {
    return '';
  }

  return resolveNegativePromptText(
    frame.prompts[selectedPlatform.value],
    t('result.fallback.noFrameNegativePrompt'),
  );
});

const overallNegativePromptText = computed(() => {
  const promptMap = result.value?.overallPrompt;
  if (!promptMap) {
    return t('result.fallback.noOverallNegativePrompt');
  }

  return resolveNegativePromptText(
    promptMap[selectedPlatform.value],
    t('result.fallback.noOverallNegativePromptForPlatform'),
  );
});

const showNegativePromptPanel = computed(() =>
  negativePromptPlatforms.includes(selectedPlatform.value),
);

watch(
  [currentFramePrompt, currentFrameNegativePrompt],
  () => {
    if (!editing.value) {
      promptDraft.value = currentFramePrompt.value;
      negativePromptDraft.value = currentFrameNegativePrompt.value;
    }
  },
  { immediate: true },
);

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

function normalizeLanguage(value: unknown): PromptLanguage {
  if (value === 'zh' || value === 'en' || value === 'bilingual') {
    return value;
  }
  return 'zh';
}

function formatDateTime(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(resolveDateLocale(locale.value), {
    hour12: false,
  });
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

function isIosDevice() {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return (
    /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function fallbackCopyText(content: string) {
  const textarea = document.createElement('textarea');
  textarea.value = content;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  textarea.style.left = '-9999px';
  textarea.style.opacity = '0';
  textarea.style.fontSize = '16px';
  document.body.appendChild(textarea);

  if (isIosDevice()) {
    textarea.removeAttribute('readonly');
    textarea.contentEditable = 'true';

    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(textarea);
    selection?.removeAllRanges();
    selection?.addRange(range);
    textarea.setSelectionRange(0, textarea.value.length);
  } else {
    textarea.focus();
    textarea.select();
  }

  try {
    return document.execCommand('copy');
  } finally {
    window.getSelection()?.removeAllRanges();
    document.body.removeChild(textarea);
  }
}

function ensureFrameIndexInRange(nextIndex: number) {
  const frameCount = result.value?.frames.length ?? 0;
  if (frameCount === 0) {
    return 0;
  }

  return Math.max(0, Math.min(frameCount - 1, nextIndex));
}

function scrollActiveFrameIntoView() {
  const container = timelineRef.value;
  if (!container) {
    return;
  }

  const activeItem = container.querySelector<HTMLElement>('[data-frame-active="true"]');
  activeItem?.scrollIntoView({
    block: 'nearest',
    inline: 'nearest',
    behavior: 'smooth',
  });
}

function selectFrameByOffset(offset: number) {
  const nextIndex = ensureFrameIndexInRange(selectedFrameIndex.value + offset);

  if (nextIndex === selectedFrameIndex.value) {
    return;
  }

  selectedFrameIndex.value = nextIndex;
  scrollActiveFrameIntoView();
}

function selectFrameByIndex(index: number) {
  const nextIndex = ensureFrameIndexInRange(index);

  if (nextIndex === selectedFrameIndex.value) {
    return;
  }

  selectedFrameIndex.value = nextIndex;
}

function handleSwipeTouchStart(event: TouchEvent) {
  const touch = event.changedTouches[0];
  if (!touch) {
    return;
  }

  swipeStartX.value = touch.clientX;
  swipeStartY.value = touch.clientY;
}

function handleSwipeTouchEnd(event: TouchEvent) {
  const startX = swipeStartX.value;
  const startY = swipeStartY.value;
  swipeStartX.value = null;
  swipeStartY.value = null;

  if (startX === null || startY === null) {
    return;
  }

  const touch = event.changedTouches[0];
  if (!touch) {
    return;
  }

  const deltaX = touch.clientX - startX;
  const deltaY = touch.clientY - startY;

  if (Math.abs(deltaX) < SWIPE_MIN_DISTANCE || Math.abs(deltaY) > SWIPE_MAX_VERTICAL_DRIFT) {
    return;
  }

  selectFrameByOffset(deltaX < 0 ? 1 : -1);
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
      actionErrorMessage.value = t('common.errors.copyFailed');
    }
  }
}

function startEdit() {
  editing.value = true;
  promptDraft.value = currentFramePrompt.value;
  negativePromptDraft.value = currentFrameNegativePrompt.value;
}

function cancelEdit() {
  editing.value = false;
  promptDraft.value = currentFramePrompt.value;
  negativePromptDraft.value = currentFrameNegativePrompt.value;
}

function applyFrameMutation(resultPayload: AnalysisFrameMutationResponse) {
  const source = result.value;
  if (!source) {
    return;
  }

  const targetIndex = source.frames.findIndex((item) => item.id === resultPayload.frame.id);
  if (targetIndex >= 0) {
    source.frames[targetIndex] = resultPayload.frame;
  }

  source.overallPrompt = resultPayload.overallPrompt;
  source.styleTags = resultPayload.styleTags;
}

async function saveEdit() {
  const frame = currentFrame.value;
  if (!frame) {
    return;
  }

  const nextPrompt = promptDraft.value.trim();
  if (!nextPrompt) {
    actionErrorMessage.value = t('result.errors.emptyPrompt');
    return;
  }

  saving.value = true;
  actionErrorMessage.value = '';

  try {
    const response = await updateFramePromptRequest(analysisId, frame.id, {
      platform: selectedPlatform.value,
      language: selectedLanguage.value,
      prompt: nextPrompt,
      negativePrompt: showNegativePromptPanel.value ? negativePromptDraft.value : undefined,
    });

    applyFrameMutation(response);
    editing.value = false;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      actionErrorMessage.value =
        (error.response?.data as { message?: string })?.message ?? t('result.errors.saveFailed');
    } else {
      actionErrorMessage.value = t('result.errors.saveFailed');
    }
  } finally {
    saving.value = false;
  }
}

async function regenerateCurrentFrame() {
  const frame = currentFrame.value;
  if (!frame) {
    return;
  }

  regenerating.value = true;
  actionErrorMessage.value = '';

  try {
    const response = await regenerateFramePromptRequest(analysisId, frame.id);
    applyFrameMutation(response);
    editing.value = false;
    promptDraft.value = currentFramePrompt.value;
    negativePromptDraft.value = currentFrameNegativePrompt.value;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      actionErrorMessage.value =
        (error.response?.data as { message?: string })?.message ?? t('result.errors.regenerateFailed');
    } else {
      actionErrorMessage.value = t('result.errors.regenerateFailed');
    }
  } finally {
    regenerating.value = false;
  }
}

async function exportPrompt(format: AnalysisExportFormat) {
  exporting.value = true;
  actionErrorMessage.value = '';

  try {
    const { blob, fileName } = await exportAnalysisRequest({
      analysisId,
      format,
      platform: selectedPlatform.value,
      language: selectedLanguage.value,
    });

    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      actionErrorMessage.value =
        (error.response?.data as { message?: string })?.message ?? t('result.errors.exportFailed');
    } else {
      actionErrorMessage.value = t('result.errors.exportFailed');
    }
  } finally {
    exporting.value = false;
  }
}

async function createShareLink() {
  sharing.value = true;
  actionErrorMessage.value = '';

  try {
    const response = await createAnalysisShareRequest(analysisId);
    shareUrl.value = new URL(
      response.sharePath,
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
    ).toString();
    shareExpiresAt.value = formatDateTime(response.expiresAt);
    await copyText(shareUrl.value);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      actionErrorMessage.value =
        (error.response?.data as { message?: string })?.message ?? t('result.errors.shareFailed');
    } else {
      actionErrorMessage.value = t('result.errors.shareFailed');
    }
  } finally {
    sharing.value = false;
  }
}

async function fetchResult() {
  loading.value = true;
  errorMessage.value = '';
  actionErrorMessage.value = '';

  try {
    const data = await getAnalysisResultRequest(analysisId);
    result.value = data;

    const firstPlatform = data.config.platforms[0] ?? 'sora';
    selectedPlatform.value = firstPlatform;
    selectedLanguage.value = normalizeLanguage(data.config.language);
    selectedFrameIndex.value = 0;
    editing.value = false;
    promptDraft.value = '';
    negativePromptDraft.value = '';
    shareUrl.value = '';
    shareExpiresAt.value = '';
  } catch (error) {
    if (axios.isAxiosError(error)) {
      errorMessage.value =
        (error.response?.data as { message?: string })?.message ?? t('result.errors.fetchResultFailed');
    } else {
      errorMessage.value = t('result.errors.fetchResultFailed');
    }
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void fetchResult();
});
</script>
