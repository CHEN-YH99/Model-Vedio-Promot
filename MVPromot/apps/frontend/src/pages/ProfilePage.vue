<template>
  <section class="vtp-page px-0 py-10">
    <div class="vtp-panel rounded-[2rem] p-6 md:p-10">
      <p class="vtp-kicker">Profile</p>
      <h1 class="vtp-title mt-4 max-w-[12ch]">个人中心先把壳子搭起来。</h1>
      <p class="vtp-body mt-4 max-w-3xl">
        账号信息、配额、历史记录入口和后续 API Key 管理位都先放好。现在后端接口还没全接上，这里先用真实账号数据 + 明确占位，避免后面路由和布局乱成一锅粥。
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
        <h2 class="mt-4 font-[var(--font-display)] text-2xl font-semibold text-white">
          {{ quotaTitle }}
        </h2>
        <p class="mt-3 text-sm leading-7 text-slate-300">
          真实配额接口后续接入。现在先把状态位和升级入口挂出来，免得做完后端才发现前端没地方放。
        </p>
        <RouterLink class="vtp-button mt-6" to="/pricing">查看升级方案</RouterLink>
      </article>

      <article class="vtp-panel rounded-[1.75rem] p-6">
        <p class="text-xs uppercase tracking-[0.18em] text-cyan-200/80">后续模块</p>
        <div class="mt-4 flex flex-wrap gap-2">
          <span
            v-for="item in placeholders"
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
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

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
  if (authStore.user?.plan === 'ENTERPRISE') {
    return '企业配额按合同配置';
  }

  if (authStore.user?.plan === 'PRO') {
    return 'Pro 当前视为无限次';
  }

  return '免费版按日限制';
});

const placeholders = ['API Key 管理', '偏好设置', '账单历史', '账号安全'];
</script>
