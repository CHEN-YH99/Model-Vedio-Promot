<template>
  <section class="vtp-page px-0 py-10">
    <div class="vtp-panel rounded-[2rem] p-6 md:p-10">
      <p class="vtp-kicker">Profile</p>
      <h1 class="vtp-title mt-4 max-w-[12ch]">{{ t('profile.title') }}</h1>
      <p class="vtp-body mt-4 max-w-3xl">
        {{ t('profile.subtitle') }}
      </p>
    </div>

    <div class="mt-6 grid gap-4 lg:grid-cols-3">
      <article class="vtp-panel rounded-[1.75rem] p-6">
        <p class="text-xs uppercase tracking-[0.18em] text-cyan-200/80">{{ t('profile.sections.account') }}</p>
        <h2 class="mt-4 font-[var(--font-display)] text-2xl font-semibold text-white">
          {{ authStore.user?.name || t('profile.account.noName') }}
        </h2>
        <p class="mt-3 text-sm text-slate-300">{{ t('profile.account.email', { value: authStore.user?.email ?? t('profile.fallback.none') }) }}</p>
        <p class="mt-2 text-sm text-slate-300">{{ t('profile.account.plan', { value: authStore.user?.plan ?? t('profile.fallback.none') }) }}</p>
        <p class="mt-2 text-sm text-slate-300">{{ t('profile.account.createdAt', { value: createdAtText }) }}</p>
      </article>

      <article class="vtp-panel rounded-[1.75rem] p-6">
        <p class="text-xs uppercase tracking-[0.18em] text-cyan-200/80">{{ t('profile.sections.quota') }}</p>

        <div v-if="loadingQuota" class="mt-4 text-sm text-slate-300">{{ t('profile.quota.loading') }}</div>

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

          <p class="mt-3 text-xs text-slate-400">{{ t('profile.quota.resetAt', { value: resetAtText }) }}</p>

          <RouterLink class="vtp-button mt-6" to="/pricing">{{ t('profile.quota.upgrade') }}</RouterLink>
        </template>
      </article>

      <article class="vtp-panel rounded-[1.75rem] p-6">
        <p class="text-xs uppercase tracking-[0.18em] text-cyan-200/80">{{ t('profile.sections.shortcuts') }}</p>
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
          {{ t('profile.shortcuts.goHistory') }}
        </RouterLink>
      </article>
    </div>

    <article class="vtp-panel mt-6 rounded-[1.75rem] p-6">
      <p class="text-xs uppercase tracking-[0.18em] text-cyan-200/80">{{ t('profile.sections.deletion') }}</p>
      <h2 class="mt-3 font-[var(--font-display)] text-2xl font-semibold text-white">{{ t('profile.deletion.title') }}</h2>
      <p class="mt-2 text-sm text-slate-300">
        {{ t('profile.deletion.desc', { days: graceDays }) }}
      </p>

      <div v-if="deletionLoading" class="mt-4 text-sm text-slate-300">{{ t('profile.deletion.loading') }}</div>

      <p
        v-else-if="deletionError"
        class="mt-4 rounded-lg border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-sm text-rose-200"
      >
        {{ deletionError }}
      </p>

      <template v-else>
        <div v-if="deletionRequest" class="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
          <p class="text-sm text-slate-200">{{ t('profile.deletion.currentStatus', { status: deletionStatusLabel(deletionRequest.status) }) }}</p>
          <p class="mt-1 text-xs text-slate-400">{{ t('profile.deletion.requestedAt', { value: formatDateTime(deletionRequest.requestedAt) }) }}</p>
          <p class="mt-1 text-xs text-slate-400">{{ t('profile.deletion.executeAfter', { value: formatDateTime(deletionRequest.executeAfter) }) }}</p>
          <p v-if="deletionRequest.reason" class="mt-1 text-xs text-slate-400">
            {{ t('profile.deletion.reason', { value: deletionRequest.reason }) }}
          </p>
          <p v-if="deletionRequest.failureReason" class="mt-1 text-xs text-rose-300">
            {{ t('profile.deletion.failureReason', { value: deletionRequest.failureReason }) }}
          </p>

          <button
            v-if="deletionRequest.status === 'PENDING'"
            class="vtp-button vtp-button--ghost mt-3"
            :disabled="deletionCanceling"
            @click="cancelDeletionRequest"
          >
            {{ deletionCanceling ? t('profile.deletion.canceling') : t('profile.deletion.cancel') }}
          </button>
        </div>

        <div v-if="deletionRequest?.status !== 'PENDING'" class="mt-5 space-y-3">
          <textarea
            v-model.trim="deletionReason"
            rows="3"
            class="w-full rounded-xl border border-white/15 bg-zinc-950/70 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/70"
            maxlength="500"
            :placeholder="t('profile.deletion.reasonPlaceholder')"
          ></textarea>
          <button
            class="vtp-button"
            :disabled="deletionSubmitting"
            @click="submitDeletionRequest"
          >
            {{ deletionSubmitting ? t('profile.deletion.submitting') : t('profile.deletion.submit') }}
          </button>
        </div>
      </template>
    </article>
  </section>
</template>

<script setup lang="ts">
import axios from 'axios';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { getAnalysisQuotaRequest } from '@/api/analysis';
import {
  cancelDataDeletionRequestRequest,
  createDataDeletionRequestRequest,
  getDataDeletionRequestStatusRequest,
} from '@/api/account';
import { resolveDateLocale } from '@/i18n';
import { useAuthStore } from '@/stores/auth';
import type { AnalysisQuotaResponse } from '@/types/analysis';
import type { DataDeletionRequestResponse, DataDeletionStatus } from '@/types/account';

const authStore = useAuthStore();
const { t, locale, tm } = useI18n();
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
    return t('profile.fallback.none');
  }

  return new Intl.DateTimeFormat(resolveDateLocale(locale.value), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(createdAt));
});

const quotaTitle = computed(() => {
  if (!quota.value) {
    return t('profile.quota.unavailable');
  }

  if (quota.value.isUnlimited) {
    return t('profile.quota.unlimitedTitle');
  }

  return t('profile.quota.remainingTitle', { remaining: quota.value.remaining ?? 0 });
});

const quotaDetail = computed(() => {
  if (!quota.value) {
    return '';
  }

  if (quota.value.isUnlimited) {
    return t('profile.quota.unlimitedDetail');
  }

  return t('profile.quota.usedDetail', { used: quota.value.used, limit: quota.value.limit ?? 0 });
});

const usagePercent = computed(() => {
  if (!quota.value || quota.value.isUnlimited || !quota.value.limit) {
    return 0;
  }

  return Math.min(100, Math.round((quota.value.used / quota.value.limit) * 100));
});

const usageText = computed(() => {
  if (!quota.value || quota.value.isUnlimited) {
    return t('profile.quota.noLimit');
  }

  return t('profile.quota.usageText', { used: quota.value.used, limit: quota.value.limit ?? 0 });
});

const resetAtText = computed(() => {
  const raw = quota.value?.resetAt;
  if (!raw) {
    return t('profile.fallback.none');
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  return date.toLocaleString(resolveDateLocale(locale.value), { hour12: false });
});

const shortcuts = computed<string[]>(() => tm('profile.shortcuts.items') as string[]);

function formatDateTime(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(resolveDateLocale(locale.value), { hour12: false });
}

function deletionStatusLabel(status: DataDeletionStatus) {
  const map: Record<DataDeletionStatus, string> = {
    PENDING: t('enum.deletionStatus.PENDING'),
    COMPLETED: t('enum.deletionStatus.COMPLETED'),
    CANCELED: t('enum.deletionStatus.CANCELED'),
    FAILED: t('enum.deletionStatus.FAILED'),
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
        (error.response?.data as { message?: string })?.message ?? t('profile.quota.errors.fetchFailed');
    } else {
      quotaError.value = t('profile.quota.errors.fetchFailed');
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
        (error.response?.data as { message?: string })?.message ?? t('profile.deletion.errors.fetchFailed');
    } else {
      deletionError.value = t('profile.deletion.errors.fetchFailed');
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
        (error.response?.data as { message?: string })?.message ?? t('profile.deletion.errors.submitFailed');
    } else {
      deletionError.value = t('profile.deletion.errors.submitFailed');
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
        (error.response?.data as { message?: string })?.message ?? t('profile.deletion.errors.cancelFailed');
    } else {
      deletionError.value = t('profile.deletion.errors.cancelFailed');
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
