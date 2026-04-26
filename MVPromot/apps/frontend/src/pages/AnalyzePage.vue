<template>
  <section class="vtp-page px-0 py-6 sm:py-10">
    <div class="mx-auto w-full max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-2xl font-semibold text-white">分析配置</h1>
        <span class="rounded-md border border-white/20 px-3 py-1 text-xs text-zinc-300">
          fileId: {{ fileId }}
        </span>
      </header>

      <div v-if="loading" class="mt-6 text-sm text-zinc-300">正在读取视频元数据...</div>

      <p
        v-else-if="errorMessage"
        class="mt-6 rounded-lg border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-sm text-rose-200"
      >
        {{ errorMessage }}
      </p>

      <div v-else-if="meta" class="mt-6 space-y-5">
      <div
        class="grid gap-3 rounded-xl border border-white/10 bg-zinc-950/40 p-4 text-sm text-zinc-200 md:grid-cols-2"
      >
        <p>文件名：{{ meta.filename }}</p>
        <p>时长：{{ meta.duration.toFixed(2) }} 秒</p>
        <p>分辨率：{{ meta.resolution }}</p>
        <p>帧率：{{ meta.fps }}</p>
        <p>编码：{{ meta.codec }}</p>
        <p>大小：{{ (meta.size / 1024 / 1024).toFixed(2) }} MB</p>
      </div>

      <form
        class="space-y-4 rounded-xl border border-white/10 bg-zinc-950/40 p-4"
        @submit.prevent="handleStartAnalysis"
      >
        <div class="grid gap-4 md:grid-cols-2">
          <label class="space-y-1 text-sm text-zinc-200">
            <span>采样密度</span>
            <select
              v-model="sampleDensity"
              class="w-full rounded-md border border-white/15 bg-zinc-900 px-2 py-2"
            >
              <option value="low">低（每10秒）</option>
              <option value="medium">中（每5秒）</option>
              <option value="high">高（每2秒）</option>
            </select>
          </label>

          <label class="space-y-1 text-sm text-zinc-200">
            <span>语言</span>
            <select
              v-model="language"
              class="w-full rounded-md border border-white/15 bg-zinc-900 px-2 py-2"
            >
              <option value="zh">中文</option>
              <option value="en">英文</option>
              <option value="bilingual">双语</option>
            </select>
          </label>
        </div>

        <div class="space-y-2">
          <p class="text-sm text-zinc-200">目标平台（可多选）</p>
          <div class="grid gap-2 sm:grid-cols-3">
            <label
              v-for="platform in platformOptions"
              :key="platform.value"
              class="flex cursor-pointer items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-sm text-zinc-200"
            >
              <input
                type="checkbox"
                class="accent-emerald-400"
                :checked="selectedPlatforms.includes(platform.value)"
                @change="togglePlatform(platform.value)"
              />
              <span>{{ platform.label }}</span>
            </label>
          </div>
        </div>

        <p
          v-if="submitError"
          class="rounded-lg border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-sm text-rose-200"
        >
          {{ submitError }}
        </p>
        <RouterLink
          v-if="quotaExceeded"
          to="/pricing"
          class="inline-flex rounded-lg border border-amber-300/40 bg-amber-300/10 px-4 py-2 text-sm text-amber-100 transition hover:border-amber-200"
        >
          配额不足，去升级 Pro
        </RouterLink>

        <button
          type="submit"
          :disabled="submitting"
          class="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ submitting ? '提交中...' : '开始分析' }}
        </button>
      </form>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import axios from 'axios';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { startAnalysisRequest } from '@/api/analysis';
import { http } from '@/api/http';
import type { PromptLanguage, PromptPlatform, SampleDensity } from '@/types/analysis';
import type { VideoMeta } from '@/types/video';

const route = useRoute();
const router = useRouter();
const fileId = String(route.params.fileId ?? '');

const loading = ref(true);
const errorMessage = ref('');
const submitError = ref('');
const submitting = ref(false);
const meta = ref<VideoMeta | null>(null);
const quotaExceeded = ref(false);

const sampleDensity = ref<SampleDensity>('medium');
const language = ref<PromptLanguage>('en');
const selectedPlatforms = ref<PromptPlatform[]>(['sora', 'runway']);

const platformOptions: Array<{ label: string; value: PromptPlatform }> = [
  { label: 'Sora', value: 'sora' },
  { label: 'Runway', value: 'runway' },
  { label: '可灵', value: 'kling' },
  { label: 'Pika', value: 'pika' },
  { label: '万象', value: 'wan' },
  { label: '海螺', value: 'hailuo' },
];

function togglePlatform(value: PromptPlatform) {
  if (selectedPlatforms.value.includes(value)) {
    selectedPlatforms.value = selectedPlatforms.value.filter((item) => item !== value);
    return;
  }

  selectedPlatforms.value = [...selectedPlatforms.value, value];
}

async function fetchMeta() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const { data } = await http.get<VideoMeta>(`/api/upload/${fileId}/meta`);
    meta.value = data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      errorMessage.value =
        (error.response?.data as { message?: string })?.message ?? '读取元数据失败';
    } else {
      errorMessage.value = '读取元数据失败';
    }
  } finally {
    loading.value = false;
  }
}

async function handleStartAnalysis() {
  submitError.value = '';
  quotaExceeded.value = false;

  if (selectedPlatforms.value.length === 0) {
    submitError.value = '至少选择一个目标平台';
    return;
  }

  submitting.value = true;

  try {
    const { analysisId } = await startAnalysisRequest({
      fileId,
      config: {
        sampleDensity: sampleDensity.value,
        language: language.value,
        platforms: selectedPlatforms.value,
      },
    });

    await router.push(`/analysis/progress/${analysisId}`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const code = (error.response?.data as { code?: string })?.code;
      quotaExceeded.value = code === 'QUOTA_EXCEEDED';
      submitError.value =
        (error.response?.data as { message?: string })?.message ?? '提交分析任务失败';
    } else {
      submitError.value = '提交分析任务失败';
    }
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  void fetchMeta();
});
</script>
