<template>
  <section class="vtp-page px-0 py-10">
    <div class="vtp-panel rounded-[2rem] p-6 md:p-10">
      <p class="vtp-kicker">Share Preview</p>
      <h1 class="vtp-title mt-4 max-w-[12ch]">公开分享页已经有入口，内容位先占住。</h1>
      <p class="vtp-body mt-4 max-w-3xl">
        分享 Token 页面后续会接 Redis TTL 72 小时和公开结果数据。现在先把公开访问的路由和页面骨架放出来，避免以后为了分享功能再重做一套布局。
      </p>
    </div>

    <div class="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <article class="vtp-panel rounded-[1.75rem] p-6">
        <p class="text-xs uppercase tracking-[0.18em] text-cyan-200/80">Share Token</p>
        <h2 class="mt-4 font-[var(--font-display)] text-2xl font-semibold text-white">
          {{ token }}
        </h2>
        <p class="mt-4 text-sm leading-7 text-slate-300">
          这里后续显示公开结果页的关键帧、平台切换和提示词内容。当前版本先确认外部访问路径可用，后面补分享接口时直接落数据。
        </p>
      </article>

      <article class="vtp-panel rounded-[1.75rem] p-6">
        <p class="text-xs uppercase tracking-[0.18em] text-cyan-200/80">状态</p>
        <div class="mt-4 flex flex-wrap gap-2">
          <span
            v-for="item in states"
            :key="item"
            class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200"
          >
            {{ item }}
          </span>
        </div>
        <div class="mt-6 flex flex-wrap gap-3">
          <RouterLink class="vtp-button" to="/">返回首页</RouterLink>
          <RouterLink class="vtp-button vtp-button--ghost" to="/pricing">查看定价</RouterLink>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const token = computed(() => String(route.params.token ?? 'pending-token'));
const states = ['公开访问骨架已就位', 'TTL 72h 待接入', '结果数据待接入'];
</script>
