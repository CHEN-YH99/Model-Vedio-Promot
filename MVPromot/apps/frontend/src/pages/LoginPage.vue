<template>
  <section class="vtp-page px-0 py-6 sm:py-10">
    <div class="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
      <h1 class="text-2xl font-semibold text-white">{{ t('login.title') }}</h1>
      <p class="mt-2 text-sm text-zinc-300">{{ t('login.subtitle') }}</p>

      <form class="mt-6 space-y-4" @submit.prevent="handleSubmit">
        <label class="block">
          <span class="mb-1 block text-sm text-zinc-200">{{ t('login.email') }}</span>
          <input
            v-model.trim="form.email"
            type="email"
            class="w-full rounded-lg border border-white/15 bg-zinc-950/60 px-3 py-2 text-white outline-none ring-emerald-300/30 transition focus:ring"
            placeholder="you@example.com"
          />
          <p class="mt-1 text-xs text-zinc-400">
            {{ t('login.domainHint', { domains: supportedEmailDomains.join(' / ') }) }}
          </p>
        </label>

        <label class="block">
          <span class="mb-1 block text-sm text-zinc-200">{{ t('login.password') }}</span>
          <input
            v-model="form.password"
            type="password"
            class="w-full rounded-lg border border-white/15 bg-zinc-950/60 px-3 py-2 text-white outline-none ring-emerald-300/30 transition focus:ring"
            :placeholder="t('login.passwordPlaceholder')"
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
          {{ submitting ? t('login.submitting') : t('login.submit') }}
        </button>
      </form>

      <div class="my-5 flex items-center gap-3 text-xs text-zinc-400">
        <span class="h-px flex-1 bg-white/10"></span>
        <span>{{ t('login.oauthSeparator') }}</span>
        <span class="h-px flex-1 bg-white/10"></span>
      </div>

      <div class="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          :disabled="submitting"
          class="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-zinc-100 transition hover:border-white/35 disabled:cursor-not-allowed disabled:opacity-60"
          @click="handleOAuthLogin('google')"
        >
          {{ t('login.google') }}
        </button>
        <button
          type="button"
          :disabled="submitting"
          class="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-zinc-100 transition hover:border-white/35 disabled:cursor-not-allowed disabled:opacity-60"
          @click="handleOAuthLogin('wechat')"
        >
          {{ t('login.wechat') }}
        </button>
      </div>

      <p class="mt-4 text-sm text-zinc-300">
        {{ t('login.noAccount') }}
        <RouterLink class="text-emerald-300 hover:underline" to="/register">{{ t('login.goRegister') }}</RouterLink>
      </p>
      <p class="mt-2 text-xs text-zinc-400">
        {{ t('common.legal.agreePrefix') }}
        <RouterLink class="text-zinc-200 hover:underline" to="/terms">{{ t('common.legal.terms') }}</RouterLink>
        {{ t('common.legal.and') }}
        <RouterLink class="text-zinc-200 hover:underline" to="/privacy">{{ t('common.legal.privacy') }}</RouterLink>
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import axios from 'axios';
import { reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { useAuthStore } from '@/stores/auth';
import type { OAuthProviderName } from '@/types/auth';
import { isSupportedEmailDomain, SUPPORTED_EMAIL_DOMAINS } from '@/utils/emailPolicy';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const form = reactive({
  email: '',
  password: '',
});

const submitting = ref(false);
const errorMessage = ref('');
const supportedEmailDomains = SUPPORTED_EMAIL_DOMAINS;

function validateLoginForm() {
  if (!form.email || !form.password) {
    return t('login.errors.required');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(form.email)) {
    return t('login.errors.invalidEmail');
  }

  if (!isSupportedEmailDomain(form.email)) {
    return t('login.errors.unsupportedDomain');
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
      errorMessage.value = (error.response?.data as { message?: string })?.message ?? t('login.errors.loginFailed');
    } else {
      errorMessage.value = t('login.errors.loginFailed');
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
