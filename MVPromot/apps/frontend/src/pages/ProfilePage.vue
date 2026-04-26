<template>
  <section class="vtp-page px-0 py-10">
    <div class="vtp-panel rounded-[2rem] p-6 md:p-10">
      <p class="vtp-kicker">Profile</p>
      <h1 class="vtp-title mt-4 max-w-[12ch]">个人中心</h1>
      <p class="vtp-body mt-4 max-w-3xl">
        这里展示账号信息、今日配额使用情况和历史记录入口。配额按上海时区自然日重置。
      </p>
    </div>

    <div class="mt-6 grid gap-4 lg:grid-cols-3">
      <article class="vtp-panel rounded-[1.75rem] p-6">
        <p class="text-xs uppercase tracking-[0.18em] text-cyan-200/80">账号</p>
        <h2 class="mt-4 font-[var(--font-display)] text-2xl font-semibold text-white">
          {{ authStore.user?.name || '未设置昵称' }}
        </h2>
        <p class="mt-3 text-sm text-slate-300">邮箱：{{ authStore.user?.email }}</p>
        <p class="mt-2 text-sm text-slate-300">计划：{{ authStore.user?.plan }}</p>
        <p class="mt-2 text-sm text-slate-300">注册时间：{{ createdAtText }}</p>
      </article>

      <article class="vtp-panel rounded-[1.75rem] p-6">
        <p class="text-xs uppercase tracking-[0.18em] text-cyan-200/80">配额</p>

        <div v-if="loadingQuota" class="mt-4 text-sm text-slate-300">正在读取配额...</div>

        <p
          v-else-if="quotaError"
          class="mt-4 rounded-lg border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-sm text-rose-200"
        >
          {{ quotaError }}
        </p>

        <template v-else-if="quota">
          <h2 class="mt-4 font-[var(--font-display)] text-2xl font-semibold text-white">
            {{ quotaTitle }}
          </h2>

          <p class="mt-3 text-sm text-slate-300">{{ quotaDetail }}</p>

          <div v-if="!quota.isUnlimited" class="mt-4">
            <div class="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div class="h-full rounded-full bg-cyan-400" :style="{ width: `${usagePercent}%` }"></div>
            </div>
            <p class="mt-2 text-xs text-slate-300">{{ usageText }}</p>
          </div>

          <p class="mt-3 text-xs text-slate-400">重置时间：{{ resetAtText }}</p>

          <RouterLink class="vtp-button mt-6" to="/pricing">查看升级方案</RouterLink>
        </template>
      </article>

      <article class="vtp-panel rounded-[1.75rem] p-6">
        <p class="text-xs uppercase tracking-[0.18em] text-cyan-200/80">快捷入口</p>
        <div class="mt-4 flex flex-wrap gap-2">
          <span
            v-for="item in shortcuts"
            :key="item"
            class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200"
          >
            {{ item }}
          </span>
        </div>
        <RouterLink class="vtp-button vtp-button--ghost mt-6" to="/history">
          查看历史记录页
        </RouterLink>
      </article>
    </div>

    <article class="vtp-panel mt-6 rounded-[1.75rem] p-6">
      <p class="text-xs uppercase tracking-[0.18em] text-cyan-200/80">数据删除（合规）</p>
      <h2 class="mt-3 font-[var(--font-display)] text-2xl font-semibold text-white">账号数据删除申请</h2>
      <p class="mt-2 text-sm text-slate-300">
        提交后进入 {{ graceDays }} 天冷静期，到期自动执行删除。冷静期内可撤销申请。
      </p>

      <div v-if="deletionLoading" class="mt-4 text-sm text-slate-300">正在读取删除申请状态...</div>

      <p
        v-else-if="deletionError"
        class="mt-4 rounded-lg border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-sm text-rose-200"
      >
        {{ deletionError }}
      </p>

      <template v-else>
        <div v-if="deletionRequest" class="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
          <p class="text-sm text-slate-200">当前状态：{{ deletionStatusLabel(deletionRequest.status) }}</p>
          <p class="mt-1 text-xs text-slate-400">申请时间：{{ formatDateTime(deletionRequest.requestedAt) }}</p>
          <p class="mt-1 text-xs text-slate-400">执行时间：{{ formatDateTime(deletionRequest.executeAfter) }}</p>
          <p v-if="deletionRequest.reason" class="mt-1 text-xs text-slate-400">
            申请备注：{{ deletionRequest.reason }}
          </p>
          <p v-if="deletionRequest.failureReason" class="mt-1 text-xs text-rose-300">
            失败原因：{{ deletionRequest.failureReason }}
          </p>

          <button
            v-if="deletionRequest.status === 'PENDING'"
            class="vtp-button vtp-button--ghost mt-3"
            :disabled="deletionCanceling"
            @click="cancelDeletionRequest"
          >
            {{ deletionCanceling ? '撤销中...' : '撤销删除申请' }}
          </button>
        </div>

        <div v-if="deletionRequest?.status !== 'PENDING'" class="mt-5 space-y-3">
          <textarea
            v-model.trim="deletionReason"
            rows="3"
            class="w-full rounded-xl border border-white/15 bg-zinc-950/70 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/70"
            maxlength="500"
            placeholder="可选：填写删除原因（最多 500 字）"
          ></textarea>
          <button
            class="vtp-button"
            :disabled="deletionSubmitting"
            @click="submitDeletionRequest"
          >
            {{ deletionSubmitting ? '提交中...' : '提交删除申请' }}
          </button>
        </div>
      </template>
    </article>
  </section>
</template>

<script setup lang="ts">
import axios from 'axios';
import { computed, onMounted, ref } from 'vue';

import { getAnalysisQuotaRequest } from '@/api/analysis';
import {
  cancelDataDeletionRequestRequest,
  createDataDeletionRequestRequest,
  getDataDeletionRequestStatusRequest,
} from '@/api/account';
import { useAuthStore } from '@/stores/auth';
import type { AnalysisQuotaResponse } from '@/types/analysis';
import type { DataDeletionRequestResponse, DataDeletionStatus } from '@/types/account';

const authStore = useAuthStore();
const loadingQuota = ref(false);
const quotaError = ref('');
const quota = ref<AnalysisQuotaResponse | null>(null);
const graceDays = 7;
const deletionLoading = ref(false);
const deletionSubmitting = ref(false);
const deletionCanceling = ref(false);
const deletionError = ref('');
const deletionReason = ref('');
const deletionRequest = ref<DataDeletionRequestResponse | null>(null);

const createdAtText = computed(() => {
  const createdAt = authStore.user?.createdAt;
  if (!createdAt) {
    return '暂无';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(createdAt));
});

const quotaTitle = computed(() => {
  if (!quota.value) {
    return '配额信息暂不可用';
  }

  if (quota.value.isUnlimited) {
    return '当前计划不限次数';
  }

  return `今日剩余 ${quota.value.remaining ?? 0} 次`;
});

const quotaDetail = computed(() => {
  if (!quota.value) {
    return '';
  }

  if (quota.value.isUnlimited) {
    return 'Pro / Enterprise 当前不限制分析次数。';
  }

  return `已使用 ${quota.value.used}/${quota.value.limit ?? 0} 次。`;
});

const usagePercent = computed(() => {
  if (!quota.value || quota.value.isUnlimited || !quota.value.limit) {
    return 0;
  }

  return Math.min(100, Math.round((quota.value.used / quota.value.limit) * 100));
});

const usageText = computed(() => {
  if (!quota.value || quota.value.isUnlimited) {
    return '无限制';
  }

  return `使用进度：${quota.value.used}/${quota.value.limit ?? 0}`;
});

const resetAtText = computed(() => {
  const raw = quota.value?.resetAt;
  if (!raw) {
    return '暂无';
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  return date.toLocaleString('zh-CN', { hour12: false });
});

const shortcuts = ['配额实时状态', '历史分析记录', '升级入口', '账号信息'];

function formatDateTime(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('zh-CN', { hour12: false });
}

function deletionStatusLabel(status: DataDeletionStatus) {
  const map: Record<DataDeletionStatus, string> = {
    PENDING: '待执行',
    COMPLETED: '已完成',
    CANCELED: '已撤销',
    FAILED: '执行失败',
  };

  return map[status];
}

async function fetchQuota() {
  loadingQuota.value = true;
  quotaError.value = '';

  try {
    quota.value = await getAnalysisQuotaRequest();
  } catch (error) {
    if (axios.isAxiosError(error)) {
      quotaError.value =
        (error.response?.data as { message?: string })?.message ?? '读取配额失败';
    } else {
      quotaError.value = '读取配额失败';
    }
  } finally {
    loadingQuota.value = false;
  }
}

async function fetchDeletionRequest() {
  deletionLoading.value = true;
  deletionError.value = '';

  try {
    const response = await getDataDeletionRequestStatusRequest();
    deletionRequest.value = response.request;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      deletionError.value =
        (error.response?.data as { message?: string })?.message ?? '读取删除申请状态失败';
    } else {
      deletionError.value = '读取删除申请状态失败';
    }
  } finally {
    deletionLoading.value = false;
  }
}

async function submitDeletionRequest() {
  deletionSubmitting.value = true;
  deletionError.value = '';

  try {
    const response = await createDataDeletionRequestRequest({
      reason: deletionReason.value || undefined,
    });
    deletionRequest.value = response;
    deletionReason.value = '';
  } catch (error) {
    if (axios.isAxiosError(error)) {
      deletionError.value =
        (error.response?.data as { message?: string })?.message ?? '提交删除申请失败';
    } else {
      deletionError.value = '提交删除申请失败';
    }
  } finally {
    deletionSubmitting.value = false;
  }
}

async function cancelDeletionRequest() {
  deletionCanceling.value = true;
  deletionError.value = '';

  try {
    deletionRequest.value = await cancelDataDeletionRequestRequest();
  } catch (error) {
    if (axios.isAxiosError(error)) {
      deletionError.value =
        (error.response?.data as { message?: string })?.message ?? '撤销删除申请失败';
    } else {
      deletionError.value = '撤销删除申请失败';
    }
  } finally {
    deletionCanceling.value = false;
  }
}

onMounted(() => {
  void fetchQuota();
  void fetchDeletionRequest();
});
</script>
