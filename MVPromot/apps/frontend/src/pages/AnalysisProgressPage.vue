<template>
  <section class="vtp-page px-0 py-6 sm:py-10">
    <div class="mx-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
      <h1 class="text-2xl font-semibold text-white">分析进行中</h1>
      <p class="mt-2 text-sm text-zinc-300">analysisId: {{ analysisId }}</p>

      <div class="mt-6 space-y-3">
        <p class="text-sm text-zinc-200">状态：{{ statusText }}</p>
        <div class="h-2 w-full overflow-hidden rounded-full bg-zinc-700">
          <div
            class="h-full bg-emerald-400 transition-all duration-300"
            :style="{ width: `${progress}%` }"
          ></div>
        </div>
        <p class="text-sm text-zinc-300">进度：{{ progress }}%</p>
      </div>

      <p
        v-if="errorMessage"
        class="mt-4 rounded-lg border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-sm text-rose-200"
      >
        {{ errorMessage }}
      </p>

      <div v-if="status === 'FAILED'" class="mt-5">
        <button
          class="rounded-lg border border-emerald-400/50 px-4 py-2 text-sm text-emerald-200 transition hover:bg-emerald-300/10"
          @click="retryCheck"
        >
          重新检查状态
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import axios from 'axios';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { getAnalysisStatusRequest } from '@/api/analysis';
import type { AnalysisStatus } from '@/types/analysis';

const route = useRoute();
const router = useRouter();

const analysisId = String(route.params.analysisId ?? '');
const status = ref<AnalysisStatus>('PENDING');
const progress = ref(0);
const errorMessage = ref('');

let timer: ReturnType<typeof setInterval> | null = null;

const statusText = computed(() => {
  if (status.value === 'PENDING') return '排队中';
  if (status.value === 'EXTRACTING') return '关键帧提取中';
  if (status.value === 'ANALYZING') return 'AI 分析中';
  if (status.value === 'DONE') return '已完成';
  return '失败';
});

async function fetchStatus() {
  try {
    const data = await getAnalysisStatusRequest(analysisId);
    status.value = data.status;
    progress.value = data.progress;
    errorMessage.value = data.errorMessage ?? '';

    if (data.status === 'DONE') {
      clearPolling();
      await router.replace(`/result/${analysisId}`);
      return;
    }

    if (data.status === 'FAILED') {
      clearPolling();
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      errorMessage.value =
        (error.response?.data as { message?: string })?.message ?? '读取分析状态失败';
    } else {
      errorMessage.value = '读取分析状态失败';
    }

    clearPolling();
  }
}

function startPolling() {
  clearPolling();
  void fetchStatus();
  timer = setInterval(() => {
    void fetchStatus();
  }, 2000);
}

function clearPolling() {
  if (!timer) {
    return;
  }

  clearInterval(timer);
  timer = null;
}

function retryCheck() {
  startPolling();
}

onMounted(() => {
  startPolling();
});

onUnmounted(() => {
  clearPolling();
});
</script>
