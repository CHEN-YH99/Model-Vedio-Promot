<template>
  <section class="vtp-page px-0 py-6 sm:py-10">
    <div class="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
      <h1 class="text-2xl font-semibold text-white">创建账号</h1>
      <p class="mt-2 text-sm text-zinc-300">注册后可使用分析、历史记录和配额系统。</p>

      <form class="mt-6 space-y-4" @submit.prevent="handleSubmit">
        <label class="block">
          <span class="mb-1 block text-sm text-zinc-200">昵称（可选）</span>
          <input
            v-model.trim="form.name"
            type="text"
            class="w-full rounded-lg border border-white/15 bg-zinc-950/60 px-3 py-2 text-white outline-none ring-emerald-300/30 transition focus:ring"
            placeholder="怎么称呼你"
          />
        </label>

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
            placeholder="至少8位，含大小写和数字"
          />
        </label>

        <label class="block">
          <span class="mb-1 block text-sm text-zinc-200">确认密码</span>
          <input
            v-model="form.confirmPassword"
            type="password"
            class="w-full rounded-lg border border-white/15 bg-zinc-950/60 px-3 py-2 text-white outline-none ring-emerald-300/30 transition focus:ring"
            placeholder="再输一遍，别手抖"
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
          {{ submitting ? '注册中...' : '注册并登录' }}
        </button>
      </form>

      <p class="mt-4 text-sm text-zinc-300">
        已有账号？
        <RouterLink class="text-emerald-300 hover:underline" to="/login">去登录</RouterLink>
      </p>
      <p class="mt-2 text-xs text-zinc-400">
        完成注册即表示你同意
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
import { useRouter } from 'vue-router';

import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const router = useRouter();

const form = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
});

const submitting = ref(false);
const errorMessage = ref('');

function validateRegisterForm() {
  if (!form.email || !form.password || !form.confirmPassword) {
    return '邮箱和密码都要填完整';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(form.email)) {
    return '邮箱格式不对';
  }

  const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!strongPassword.test(form.password)) {
    return '密码至少8位，并包含大小写字母和数字';
  }

  if (form.password !== form.confirmPassword) {
    return '两次密码不一致';
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
    await authStore.register({
      email: form.email,
      password: form.password,
      name: form.name || undefined,
    });

    await router.push('/');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      errorMessage.value = (error.response?.data as { message?: string })?.message ?? '注册失败';
    } else {
      errorMessage.value = '注册失败';
    }
  } finally {
    submitting.value = false;
  }
}
</script>
