<template>
  <section class="vtp-page px-0 py-8 sm:py-12">
    <div class="mx-auto w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
      <h1 class="text-2xl font-semibold text-white">{{ t('oauth.title') }}</h1>

      <p v-if="status === 'loading'" class="mt-3 text-sm text-zinc-300">
        {{ t('oauth.loading') }}
      </p>

      <p
        v-else
        class="mt-4 rounded-lg border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-sm text-rose-200"
      >
        {{ errorMessage }}
      </p>

      <RouterLink
        v-if="status === 'error'"
        to="/login"
        class="mt-5 inline-flex rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm text-zinc-100 transition hover:border-white/40"
      >
        {{ t('oauth.backLogin') }}
      </RouterLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import axios from 'axios';
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const status = ref<'loading' | 'error'>('loading');
const errorMessage = ref('');

function parseOAuthError(code: string) {
  switch (code) {
    case 'GOOGLE_OAUTH_FAILED':
      return t('oauth.errors.googleFailed');
    case 'WECHAT_OAUTH_FAILED':
      return t('oauth.errors.wechatFailed');
    default:
      return t('oauth.errors.genericFailed');
  }
}

async function handleCallback() {
  const errorCode = typeof route.query.error === 'string' ? route.query.error : '';

  if (errorCode) {
    status.value = 'error';
    errorMessage.value = parseOAuthError(errorCode);
    return;
  }

  const exchangeCode = typeof route.query.code === 'string' ? route.query.code : '';

  if (!exchangeCode) {
    status.value = 'error';
    errorMessage.value = t('oauth.errors.missingCode');
    return;
  }

  try {
    const payload = await authStore.exchangeOAuthCode(exchangeCode);
    const redirectPath = payload.redirectPath || '/';
    await router.replace(redirectPath);
  } catch (error) {
    status.value = 'error';

    if (axios.isAxiosError(error)) {
      errorMessage.value =
        (error.response?.data as { message?: string })?.message ?? t('oauth.errors.exchangeFailed');
      return;
    }

    errorMessage.value = t('oauth.errors.exchangeFailed');
  }
}

onMounted(() => {
  void handleCallback();
});
</script>
