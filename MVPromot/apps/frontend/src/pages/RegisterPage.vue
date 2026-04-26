<template>
  <section class="vtp-page px-0 py-6 sm:py-10">
    <div class="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
      <h1 class="text-2xl font-semibold text-white">{{ t('register.title') }}</h1>
      <p class="mt-2 text-sm text-zinc-300">{{ t('register.subtitle') }}</p>

      <form class="mt-6 space-y-4" @submit.prevent="handleSubmit">
        <label class="block">
          <span class="mb-1 block text-sm text-zinc-200">{{ t('register.nickname') }}</span>
          <input
            v-model.trim="form.name"
            type="text"
            class="w-full rounded-lg border border-white/15 bg-zinc-950/60 px-3 py-2 text-white outline-none ring-emerald-300/30 transition focus:ring"
            :placeholder="t('register.nicknamePlaceholder')"
          />
        </label>

        <label class="block">
          <span class="mb-1 block text-sm text-zinc-200">{{ t('register.email') }}</span>
          <div class="flex overflow-hidden rounded-lg border border-white/15 bg-zinc-950/60">
            <input
              v-model.trim="form.emailLocalPart"
              type="text"
              class="min-w-0 flex-1 px-3 py-2 text-white outline-none ring-emerald-300/30 transition focus:ring"
              :placeholder="t('register.emailLocalPlaceholder')"
              autocomplete="username"
            />
            <span class="flex items-center border-l border-white/10 px-2 text-zinc-400">@</span>
            <select
              v-model="form.emailDomain"
              class="w-32 border-l border-white/10 bg-zinc-950/90 px-2 py-2 text-white outline-none ring-emerald-300/30 transition focus:ring"
            >
              <option v-for="domain in supportedEmailDomains" :key="domain" :value="domain">
                {{ domain }}
              </option>
            </select>
          </div>
          <p class="mt-1 text-xs text-zinc-400">
            {{ t('register.domainHint', { domains: supportedEmailDomains.join(' / ') }) }}
          </p>
        </label>

        <label class="block">
          <span class="mb-1 block text-sm text-zinc-200">{{ t('register.password') }}</span>
          <input
            v-model="form.password"
            type="password"
            class="w-full rounded-lg border border-white/15 bg-zinc-950/60 px-3 py-2 text-white outline-none ring-emerald-300/30 transition focus:ring"
            :placeholder="t('register.passwordPlaceholder')"
          />
        </label>

        <label class="block">
          <span class="mb-1 block text-sm text-zinc-200">{{ t('register.confirmPassword') }}</span>
          <input
            v-model="form.confirmPassword"
            type="password"
            class="w-full rounded-lg border border-white/15 bg-zinc-950/60 px-3 py-2 text-white outline-none ring-emerald-300/30 transition focus:ring"
            :placeholder="t('register.confirmPasswordPlaceholder')"
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
          {{ submitting ? t('register.submitting') : t('register.submit') }}
        </button>
      </form>

      <p class="mt-4 text-sm text-zinc-300">
        {{ t('register.hasAccount') }}
        <RouterLink class="text-emerald-300 hover:underline" to="/login">{{ t('register.goLogin') }}</RouterLink>
      </p>
      <p class="mt-2 text-xs text-zinc-400">
        {{ t('common.legal.agreePrefixRegister') }}
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
import { useRouter } from 'vue-router';

import { useAuthStore } from '@/stores/auth';
import {
  buildEmailAddress,
  SUPPORTED_EMAIL_DOMAINS,
  type SupportedEmailDomain,
} from '@/utils/emailPolicy';

const authStore = useAuthStore();
const router = useRouter();
const { t } = useI18n();

const form = reactive({
  name: '',
  emailLocalPart: '',
  emailDomain: 'qq.com' as SupportedEmailDomain,
  password: '',
  confirmPassword: '',
});

const supportedEmailDomains = SUPPORTED_EMAIL_DOMAINS;

const submitting = ref(false);
const errorMessage = ref('');

function validateRegisterForm() {
  if (!form.emailLocalPart || !form.password || !form.confirmPassword) {
    return t('register.errors.required');
  }

  const localPartRegex = /^[a-zA-Z0-9._%+-]{1,64}$/;
  if (!localPartRegex.test(form.emailLocalPart)) {
    return t('register.errors.invalidEmailLocalPart');
  }

  const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!strongPassword.test(form.password)) {
    return t('register.errors.weakPassword');
  }

  if (form.password !== form.confirmPassword) {
    return t('register.errors.passwordMismatch');
  }

  return '';
}

async function handleSubmit() {
  errorMessage.value = validateRegisterForm();
  if (errorMessage.value) {
    return;
  }

  submitting.value = true;

  try {
    const email = buildEmailAddress(form.emailLocalPart, form.emailDomain);

    await authStore.register({
      email,
      password: form.password,
      name: form.name || undefined,
    });

    await router.push('/');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      errorMessage.value =
        (error.response?.data as { message?: string })?.message ?? t('register.errors.registerFailed');
    } else {
      errorMessage.value = t('register.errors.registerFailed');
    }
  } finally {
    submitting.value = false;
  }
}
</script>
