<template>
  <section class="vtp-page px-0 py-8 sm:py-12">
    <div class="mx-auto w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
      <h1 class="text-2xl font-semibold text-white">第三方登录回调</h1>

      <p v-if="status === 'loading'" class="mt-3 text-sm text-zinc-300">
        正在完成授权登录，请稍候...
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
        返回登录页
      </RouterLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import axios from 'axios';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const status = ref<'loading' | 'error'>('loading');
const errorMessage = ref('');

function parseOAuthError(code: string) {
  switch (code) {
    case 'GOOGLE_OAUTH_FAILED':
      return 'Google 授权失败，请重试。';
    case 'WECHAT_OAUTH_FAILED':
      return '微信授权失败，请重试。';
    default:
      return '第三方登录失败，请稍后再试。';
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
    errorMessage.value = '缺少 OAuth 临时凭证，无法完成登录。';
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
        (error.response?.data as { message?: string })?.message ?? '第三方登录失败，请重试';
      return;
    }

    errorMessage.value = '第三方登录失败，请重试';
  }
}

onMounted(() => {
  void handleCallback();
});
</script>
