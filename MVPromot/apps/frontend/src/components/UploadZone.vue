<template>
  <section class="rounded-2xl border border-white/10 bg-white/5 p-6">
    <h2 class="text-xl font-semibold text-white">上传视频</h2>
    <p class="mt-2 text-sm text-zinc-300">
      支持本地上传或链接导入（YouTube / Bilibili），免费用户 100MB，Pro/企业 500MB。
    </p>
    <p
      v-if="!authStore.isAuthenticated"
      class="mt-3 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-50"
    >
      首页可以先看流程，真正上传和分析前还是得先登录，不然接口只会把你挡在门外。
    </p>

    <div class="mt-5 inline-flex rounded-xl border border-white/10 bg-black/20 p-1 text-sm">
      <button
        type="button"
        class="rounded-lg px-4 py-2 transition"
        :class="
          activeTab === 'local'
            ? 'bg-emerald-400 text-emerald-950'
            : 'text-zinc-300 hover:bg-white/10 hover:text-white'
        "
        @click="activeTab = 'local'"
      >
        本地上传
      </button>
      <button
        type="button"
        class="rounded-lg px-4 py-2 transition"
        :class="
          activeTab === 'url'
            ? 'bg-emerald-400 text-emerald-950'
            : 'text-zinc-300 hover:bg-white/10 hover:text-white'
        "
        @click="activeTab = 'url'"
      >
        链接导入
      </button>
    </div>

    <template v-if="activeTab === 'local'">
      <div
        class="mt-5 rounded-xl border border-dashed border-emerald-300/40 bg-emerald-300/5 p-8 text-center transition"
        :class="{ 'border-emerald-200 bg-emerald-300/15': dragging }"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="handleDrop"
      >
        <input
          ref="fileInputRef"
          type="file"
          accept="video/*"
          class="hidden"
          @change="handleFileInput"
        />
        <input
          ref="cameraInputRef"
          type="file"
          accept="video/*"
          capture="environment"
          class="hidden"
          @change="handleCameraInput"
        />
        <p class="text-sm text-zinc-200">拖拽视频到这里，或者</p>
        <div class="mt-3 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            class="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400"
            @click="openFileDialog"
          >
            {{
              authStore.isAuthenticated
                ? isMobileUploadMode
                  ? '从相册/文件选择'
                  : '点击选择文件'
                : '登录后上传'
            }}
          </button>
          <button
            v-if="isMobileUploadMode"
            type="button"
            class="rounded-lg border border-white/20 bg-black/20 px-4 py-2 text-sm text-zinc-100 transition hover:border-emerald-300 hover:text-emerald-200"
            @click="openCameraDialog"
          >
            直接拍摄视频
          </button>
        </div>
        <p v-if="isMobileUploadMode" class="mt-2 text-xs text-zinc-400">
          手机端支持相册/文件管理器选择，也支持直接调起摄像头拍摄。
        </p>
      </div>

      <div v-if="uploadStore.status === 'uploading'" class="mt-5 space-y-2">
        <p class="text-sm text-zinc-200">上传中 {{ uploadStore.progress }}%</p>
        <div class="h-2 w-full overflow-hidden rounded-full bg-zinc-700">
          <div
            class="h-full bg-emerald-400 transition-all duration-200"
            :style="{ width: `${uploadStore.progress}%` }"
          ></div>
        </div>
      </div>

      <p
        v-if="uploadStore.status === 'error'"
        class="mt-4 rounded-lg border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-sm text-rose-200"
      >
        {{ uploadStore.errorMessage }}
      </p>
    </template>

    <template v-else>
      <div class="mt-5 space-y-4 rounded-xl border border-white/10 bg-black/20 p-4">
        <label class="block">
          <span class="text-sm text-zinc-200">视频链接</span>
          <input
            v-model.trim="urlInput"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            class="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100 outline-none ring-emerald-400 transition focus:border-emerald-400 focus:ring-2"
          />
        </label>

        <div class="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-3 text-xs text-amber-100">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p>版权声明：仅处理你本人拥有或已获授权的视频内容。</p>
            <button
              type="button"
              class="rounded-md border border-amber-200/50 px-2 py-1 text-[11px] text-amber-50 transition hover:border-amber-100"
              @click="openAgreementModal()"
            >
              查看并勾选声明
            </button>
          </div>
          <p class="mt-2">
            当前状态：
            <span :class="agreedToTerms ? 'text-emerald-200' : 'text-amber-200'">
              {{ agreedToTerms ? '已勾选并同意' : '未勾选' }}
            </span>
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="rounded-lg border border-white/20 px-4 py-2 text-sm text-zinc-100 transition hover:border-emerald-300 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!canParse"
            @click="handleParseUrl"
          >
            {{ parseLoading ? '解析中...' : authStore.isAuthenticated ? '解析链接' : '登录后解析' }}
          </button>

          <button
            type="button"
            class="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!canDownload"
            @click="handleDownloadUrl"
          >
            {{
              downloadLoading
                ? '下载中...'
                : authStore.isAuthenticated
                  ? '下载并继续分析'
                  : '登录后继续分析'
            }}
          </button>
        </div>

        <div
          v-if="parsedMeta"
          class="rounded-lg border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm text-emerald-100"
        >
          <p>
            <span class="text-emerald-200">平台：</span>{{ formatPlatform(parsedMeta.platform) }}
          </p>
          <p class="mt-1"><span class="text-emerald-200">标题：</span>{{ parsedMeta.title }}</p>
          <p class="mt-1">
            <span class="text-emerald-200">时长：</span>{{ formatDuration(parsedMeta.duration) }}
          </p>
          <p class="mt-1">
            <span class="text-emerald-200">清晰度：</span>
            {{ parsedMeta.qualities.join(' / ') || '未知' }}
          </p>
        </div>

        <div v-if="downloadLoading" class="space-y-2">
          <p class="text-sm text-zinc-200">下载处理中 {{ pseudoDownloadProgress }}%</p>
          <p v-if="downloadTaskId" class="text-xs text-zinc-400">任务ID：{{ downloadTaskId }}</p>
          <div class="h-2 w-full overflow-hidden rounded-full bg-zinc-700">
            <div
              class="h-full bg-emerald-400 transition-all duration-300"
              :style="{ width: `${pseudoDownloadProgress}%` }"
            ></div>
          </div>
        </div>

        <p
          v-if="urlErrorMessage"
          class="rounded-lg border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-sm text-rose-200"
        >
          {{ urlErrorMessage }}
        </p>
      </div>
    </template>

    <div
      v-if="agreementModalVisible"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="版权声明确认"
    >
      <button
        type="button"
        class="absolute inset-0 bg-black/70"
        aria-label="关闭版权声明弹窗"
        @click="closeAgreementModal"
      ></button>

      <div class="relative z-10 w-full max-w-lg rounded-2xl border border-white/20 bg-zinc-950 p-5 shadow-2xl">
        <p class="text-xs uppercase tracking-[0.2em] text-amber-200/80">版权声明</p>
        <h3 class="mt-2 text-lg font-semibold text-white">未勾选声明前，不能继续解析或下载</h3>
        <p class="mt-3 text-sm leading-6 text-zinc-300">
          我确认该视频为本人拥有或已获得授权用于 AI 创作分析，并同意平台仅解析公开画面，不用于传播原始视频内容。
        </p>

        <label
          class="mt-4 flex items-start gap-2 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs text-amber-100"
        >
          <input
            v-model="agreementDraftChecked"
            type="checkbox"
            class="mt-0.5 h-4 w-4 rounded border-zinc-500 bg-zinc-900 text-emerald-400"
          />
          <span>我已阅读并同意以上版权声明</span>
        </label>

        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg border border-white/20 px-4 py-2 text-sm text-zinc-200 transition hover:border-white/40"
            @click="closeAgreementModal"
          >
            取消
          </button>
          <button
            type="button"
            :disabled="!agreementDraftChecked"
            class="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            @click="confirmAgreementAndContinue"
          >
            同意并继续
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import axios from 'axios';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import {
  getDownloadVideoUrlStatusRequest,
  parseVideoUrlRequest,
  startDownloadVideoUrlRequest,
} from '@/api/url-upload';
import { http } from '@/api/http';
import { useAuthStore } from '@/stores/auth';
import { useUploadStore } from '@/stores/upload';
import type { ParsedVideoUrlResponse, UrlVideoPlatform } from '@/types/url-upload';

const ALLOWED_EXTENSIONS = new Set(['mp4', 'mov', 'avi', 'webm']);
type UploadTab = 'local' | 'url';
type PendingUrlAction = 'parse' | 'download' | null;

const router = useRouter();
const authStore = useAuthStore();
const uploadStore = useUploadStore();

const activeTab = ref<UploadTab>('local');
const dragging = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);
const cameraInputRef = ref<HTMLInputElement | null>(null);
const isMobileUploadMode = ref(false);

const urlInput = ref('');
const agreedToTerms = ref(false);
const agreementModalVisible = ref(false);
const agreementDraftChecked = ref(false);
const pendingUrlAction = ref<PendingUrlAction>(null);
const parseLoading = ref(false);
const downloadLoading = ref(false);
const downloadTaskId = ref('');
const parsedMeta = ref<ParsedVideoUrlResponse | null>(null);
const urlErrorMessage = ref('');
const pseudoDownloadProgress = ref(0);

let downloadProgressTimer: ReturnType<typeof setInterval> | null = null;
let downloadStatusTimer: ReturnType<typeof setInterval> | null = null;
let downloadStatusPolling = false;

const maxFileSize = computed(() => {
  if (!authStore.user || authStore.user.plan === 'FREE') {
    return 100 * 1024 * 1024;
  }

  return 500 * 1024 * 1024;
});

const canParse = computed(() => {
  return Boolean(urlInput.value.trim()) && !parseLoading.value && !downloadLoading.value;
});

const canDownload = computed(() => {
  return Boolean(parsedMeta.value) && !parseLoading.value && !downloadLoading.value;
});

watch(urlInput, () => {
  parsedMeta.value = null;
  urlErrorMessage.value = '';
});

watch(activeTab, (tab) => {
  if (tab === 'url') {
    uploadStore.reset();
    return;
  }

  clearDownloadStatusPolling();
  stopDownloadProgress(false);
  downloadLoading.value = false;
  downloadTaskId.value = '';
  closeAgreementModal();
  urlErrorMessage.value = '';
});

async function openFileDialog() {
  if (!(await ensureAuthenticated())) {
    return;
  }

  fileInputRef.value?.click();
}

async function openCameraDialog() {
  if (!(await ensureAuthenticated())) {
    return;
  }

  cameraInputRef.value?.click();
}

function validateFile(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return '格式不支持，只能上传 MP4/MOV/AVI/WebM';
  }

  if (file.size > maxFileSize.value) {
    const maxMb = Math.floor(maxFileSize.value / 1024 / 1024);
    return `文件太大，当前账号上限 ${maxMb}MB`;
  }

  return '';
}

async function uploadFile(file: File) {
  if (!(await ensureAuthenticated())) {
    return;
  }

  const validationMessage = validateFile(file);

  if (validationMessage) {
    uploadStore.markError(validationMessage);
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  uploadStore.startUpload();

  try {
    const { data } = await http.post<{ fileId: string }>('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (event) => {
        if (!event.total || event.total <= 0) {
          return;
        }

        const progress = Math.round((event.loaded / event.total) * 100);
        uploadStore.updateProgress(progress);
      },
    });

    uploadStore.markSuccess(data.fileId);
    await router.push(`/analyze/${data.fileId}`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message =
        (error.response?.data as { message?: string })?.message ?? '上传失败，请稍后重试';
      uploadStore.markError(message);
    } else {
      uploadStore.markError('上传失败，请稍后重试');
    }
  }
}

async function handleDrop(event: DragEvent) {
  dragging.value = false;

  const file = event.dataTransfer?.files?.[0];
  if (!file) {
    uploadStore.markError('没有检测到文件');
    return;
  }

  await uploadFile(file);
}

async function handleFileInput(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  await uploadFile(file);
  input.value = '';
}

async function handleCameraInput(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  await uploadFile(file);
  input.value = '';
}

function detectMobileUploadMode() {
  if (typeof window === 'undefined') {
    return false;
  }

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const narrowScreen = window.matchMedia('(max-width: 767px)').matches;
  const touchCapable = navigator.maxTouchPoints > 0;

  return coarsePointer || narrowScreen || touchCapable;
}

async function ensureAuthenticated() {
  const hasSession = await authStore.ensureFreshAccessToken();

  if (hasSession && authStore.user) {
    return true;
  }

  uploadStore.markError('登录状态已失效，请重新登录后再上传或分析视频');
  await router.push({
    path: '/login',
    query: {
      redirect: router.currentRoute.value.fullPath,
    },
  });
  return false;
}

function openAgreementModal(action: Exclude<PendingUrlAction, null> | null = null) {
  pendingUrlAction.value = action;
  agreementDraftChecked.value = agreedToTerms.value;
  agreementModalVisible.value = true;
}

function closeAgreementModal() {
  agreementModalVisible.value = false;
  agreementDraftChecked.value = agreedToTerms.value;
  pendingUrlAction.value = null;
}

async function confirmAgreementAndContinue() {
  if (!agreementDraftChecked.value) {
    urlErrorMessage.value = '请先勾选并同意版权声明';
    return;
  }

  agreedToTerms.value = true;
  agreementModalVisible.value = false;

  const action = pendingUrlAction.value;
  pendingUrlAction.value = null;

  if (action === 'parse') {
    await handleParseUrl();
    return;
  }

  if (action === 'download') {
    await handleDownloadUrl();
  }
}

function ensureAgreement(action: Exclude<PendingUrlAction, null>) {
  if (agreedToTerms.value) {
    return true;
  }

  urlErrorMessage.value = '请先在版权声明弹窗中勾选同意后再继续';
  openAgreementModal(action);
  return false;
}

function formatDuration(seconds: number) {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainSeconds = totalSeconds % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(remainSeconds).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${mm}:${ss}`;
  }

  return `${mm}:${ss}`;
}

function formatPlatform(platform: UrlVideoPlatform) {
  if (platform === 'youtube') {
    return 'YouTube';
  }

  return 'Bilibili';
}

function stopDownloadProgress(success: boolean) {
  if (downloadProgressTimer) {
    clearInterval(downloadProgressTimer);
    downloadProgressTimer = null;
  }

  pseudoDownloadProgress.value = success ? 100 : 0;
}

function startDownloadProgress() {
  if (downloadProgressTimer) {
    clearInterval(downloadProgressTimer);
  }
  pseudoDownloadProgress.value = 6;

  downloadProgressTimer = setInterval(() => {
    pseudoDownloadProgress.value = Math.min(92, pseudoDownloadProgress.value + 4);
  }, 260);
}

function clearDownloadStatusPolling() {
  if (!downloadStatusTimer) {
    return;
  }

  clearInterval(downloadStatusTimer);
  downloadStatusTimer = null;
}

async function checkDownloadTaskStatus(taskId: string) {
  if (downloadStatusPolling) {
    return;
  }

  downloadStatusPolling = true;

  try {
    const status = await getDownloadVideoUrlStatusRequest(taskId);
    pseudoDownloadProgress.value = Math.max(pseudoDownloadProgress.value, status.progress);

    if (status.status === 'DONE' && status.result) {
      clearDownloadStatusPolling();
      stopDownloadProgress(true);
      downloadLoading.value = false;
      downloadTaskId.value = '';
      uploadStore.markSuccess(status.result.fileId);
      await router.push(`/analyze/${status.result.fileId}`);
      return;
    }

    if (status.status === 'DONE' && !status.result) {
      clearDownloadStatusPolling();
      stopDownloadProgress(false);
      downloadLoading.value = false;
      downloadTaskId.value = '';
      urlErrorMessage.value = '下载任务完成但未返回文件信息，请重试';
      return;
    }

    if (status.status === 'FAILED') {
      clearDownloadStatusPolling();
      stopDownloadProgress(false);
      downloadLoading.value = false;
      downloadTaskId.value = '';
      urlErrorMessage.value = status.errorMessage ?? '链接下载失败，请稍后重试';
    }
  } catch (error) {
    clearDownloadStatusPolling();
    stopDownloadProgress(false);
    downloadLoading.value = false;
    downloadTaskId.value = '';

    if (axios.isAxiosError(error)) {
      const message =
        (error.response?.data as { message?: string })?.message ?? '下载任务状态读取失败';
      urlErrorMessage.value = message;
    } else {
      urlErrorMessage.value = '下载任务状态读取失败';
    }
  } finally {
    downloadStatusPolling = false;
  }
}

function startDownloadStatusPolling(taskId: string) {
  clearDownloadStatusPolling();
  downloadTaskId.value = taskId;

  void checkDownloadTaskStatus(taskId);
  downloadStatusTimer = setInterval(() => {
    void checkDownloadTaskStatus(taskId);
  }, 1200);
}

async function handleParseUrl() {
  if (!(await ensureAuthenticated())) {
    return;
  }

  if (!ensureAgreement('parse')) {
    return;
  }

  const currentUrl = urlInput.value.trim();
  if (!currentUrl) {
    urlErrorMessage.value = '请输入视频链接';
    return;
  }

  parseLoading.value = true;
  parsedMeta.value = null;
  urlErrorMessage.value = '';

  try {
    parsedMeta.value = await parseVideoUrlRequest({
      url: currentUrl,
      agreedToTerms: agreedToTerms.value,
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message =
        (error.response?.data as { message?: string })?.message ?? '链接解析失败，请稍后重试';
      urlErrorMessage.value = message;
    } else {
      urlErrorMessage.value = '链接解析失败，请稍后重试';
    }
  } finally {
    parseLoading.value = false;
  }
}

async function handleDownloadUrl() {
  if (!(await ensureAuthenticated())) {
    return;
  }

  if (!ensureAgreement('download')) {
    return;
  }

  const currentUrl = urlInput.value.trim();
  if (!currentUrl) {
    urlErrorMessage.value = '请输入视频链接';
    return;
  }

  if (!parsedMeta.value) {
    await handleParseUrl();
    if (!parsedMeta.value) {
      return;
    }
  }

  downloadLoading.value = true;
  clearDownloadStatusPolling();
  downloadStatusPolling = false;
  downloadTaskId.value = '';
  urlErrorMessage.value = '';
  startDownloadProgress();

  try {
    const task = await startDownloadVideoUrlRequest({
      url: currentUrl,
      agreedToTerms: agreedToTerms.value,
    });
    pseudoDownloadProgress.value = Math.max(pseudoDownloadProgress.value, task.progress);

    if (task.status === 'FAILED') {
      stopDownloadProgress(false);
      downloadLoading.value = false;
      urlErrorMessage.value = task.errorMessage ?? '链接下载失败，请稍后重试';
      return;
    }

    if (task.status === 'DONE' && task.result) {
      stopDownloadProgress(true);
      downloadLoading.value = false;
      uploadStore.markSuccess(task.result.fileId);
      await router.push(`/analyze/${task.result.fileId}`);
      return;
    }

    startDownloadStatusPolling(task.taskId);
  } catch (error) {
    clearDownloadStatusPolling();
    stopDownloadProgress(false);
    downloadLoading.value = false;
    downloadTaskId.value = '';

    if (axios.isAxiosError(error)) {
      const message =
        (error.response?.data as { message?: string })?.message ?? '链接下载失败，请稍后重试';
      urlErrorMessage.value = message;
    } else {
      urlErrorMessage.value = '链接下载失败，请稍后重试';
    }
  }
}

onUnmounted(() => {
  clearDownloadStatusPolling();
  stopDownloadProgress(false);
});

onMounted(() => {
  isMobileUploadMode.value = detectMobileUploadMode();
});
</script>
