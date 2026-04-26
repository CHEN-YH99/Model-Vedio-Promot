<template>
  <section class="vtp-page px-0 py-6 sm:py-10">
    <div class="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
      <h1 class="text-2xl font-semibold text-white">登录账号</h1>
      <p class="mt-2 text-sm text-zinc-300">先登录，后面上传和分析流程才开闸。</p>

      <form class="mt-6 space-y-4" @submit.prevent="handleSubmit">
        <label class="block">
          <span class="mb-1 block text-sm text-zinc-200">邮箱</span>
          <input
            v-model.trim="form.email"
            type="email"
            class="w-full rounded-lg border border-white/15 bg-zinc-950/60 px-3 py-2 text-white outline-none ring-emerald-300/30 transition focus:ring"
            placeholder="you@example.com"
          />
        </label>

        <label class="block">
          <span class="mb-1 block text-sm text-zinc-200">密码</span>
          <input
            v-model="form.password"
            type="password"
            class="w-full rounded-lg border border-white/15 bg-zinc-950/60 px-3 py-2 text-white outline-none ring-emerald-300/30 transition focus:ring"
            placeholder="请输入密码"
          />
        </label>

        <p
          v-if="errorMessage"
          class="rounded-lg border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-sm text-rose-200"
        >
          {{ errorMessage }}
        </p>

        <button
          type="submit"
          :disabled="submitting"
          class="w-full rounded-lg bg-emerald-500 px-4 py-2 font-medium text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ submitting ? '登录中...' : '登录' }}
        </button>
      </form>

      <div class="my-5 flex items-center gap-3 text-xs text-zinc-400">
        <span class="h-px flex-1 bg-white/10"></span>
        <span>或使用第三方登录</span>
        <span class="h-px flex-1 bg-white/10"></span>
      </div>

      <div class="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          :disabled="submitting"
          class="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-zinc-100 transition hover:border-white/35 disabled:cursor-not-allowed disabled:opacity-60"
          @click="handleOAuthLogin('google')"
        >
          Google 登录
        </button>
        <button
          type="button"
          :disabled="submitting"
          class="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-zinc-100 transition hover:border-white/35 disabled:cursor-not-allowed disabled:opacity-60"
          @click="handleOAuthLogin('wechat')"
        >
          微信登录
        </button>
      </div>

      <p class="mt-4 text-sm text-zinc-300">
        还没账号？
        <RouterLink class="text-emerald-300 hover:underline" to="/register">去注册</RouterLink>
      </p>
      <p class="mt-2 text-xs text-zinc-400">
        继续即表示你同意
        <RouterLink class="text-zinc-200 hover:underline" to="/terms">《服务条款》</RouterLink>
        与
        <RouterLink class="text-zinc-200 hover:underline" to="/privacy">《隐私政策》</RouterLink>
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import axios from 'axios';
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAuthStore } from '@/stores/auth';
import type { OAuthProviderName } from '@/types/auth';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const form = reactive({
  email: '',
  password: '',
});

const submitting = ref(false);
const errorMessage = ref('');

function validateLoginForm() {
  if (!form.email || !form.password) {
    return '邮箱和密码都要填';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(form.email)) {
    return '邮箱格式不对';
  }

  return '';
}

async function handleSubmit() {
  errorMessage.value = validateLoginForm();
  if (errorMessage.value) {
    return;
  }

  submitting.value = true;

  try {
    await authStore.login({
      email: form.email,
      password: form.password,
    });

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
    await router.push(redirect);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      errorMessage.value = (error.response?.data as { message?: string })?.message ?? '登录失败';
    } else {
      errorMessage.value = '登录失败';
    }
  } finally {
    submitting.value = false;
  }
}

function handleOAuthLogin(provider: OAuthProviderName) {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
  const startUrl =
    provider === 'google'
      ? authStore.getGoogleOAuthStartUrl(redirect)
      : authStore.getWeChatOAuthStartUrl(redirect);

  window.location.href = startUrl;
}
</script>
