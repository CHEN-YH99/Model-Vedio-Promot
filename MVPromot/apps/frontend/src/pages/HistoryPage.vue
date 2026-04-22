<template>
  <section class="vtp-page px-0 py-10">
    <div class="vtp-panel rounded-[2rem] p-6 md:p-10">
      <p class="vtp-kicker">History</p>
      <h1 class="vtp-title mt-4 max-w-[12ch]">历史记录页先占住入口。</h1>
      <p class="vtp-body mt-4 max-w-3xl">
        分页接口和删除能力还没接进来，但页面和路由先长出来才像个产品。现在先放清晰的占位说明和预览卡片，等接口好了直接填数据，不用再从导航开始拆。
      </p>
    </div>

    <div class="mt-6 grid gap-4">
      <article
        v-for="item in previewItems"
        :key="item.title"
        class="vtp-panel grid gap-3 rounded-[1.75rem] p-6 md:grid-cols-[220px_1fr_auto] md:items-center"
      >
        <div class="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
          <p class="text-xs uppercase tracking-[0.16em] text-cyan-200/80">{{ item.status }}</p>
          <p class="mt-3 font-[var(--font-display)] text-xl font-semibold text-white">
            {{ item.platform }}
          </p>
        </div>

        <div>
          <h2 class="font-[var(--font-display)] text-2xl font-semibold text-white">
            {{ item.title }}
          </h2>
          <p class="mt-3 text-sm leading-7 text-slate-300">{{ item.description }}</p>
        </div>

        <div class="flex flex-wrap gap-2 md:justify-end">
          <span
            v-for="tag in item.tags"
            :key="tag"
            class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200"
          >
            {{ tag }}
          </span>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
const previewItems = [
  {
    status: '占位记录',
    platform: 'Sora',
    title: '参考视频拆解预览',
    description: '这里后续接入分页历史记录接口，支持查看、删除和重新进入结果页。',
    tags: ['关键帧预览', '整体提示词', '等待接口'],
  },
  {
    status: '占位记录',
    platform: 'Runway',
    title: '镜头语言适配预览',
    description: '等历史接口接上后，这一行会替换成真实分析数据，而不是临时占位文案。',
    tags: ['镜头指令', '编辑记录', '等待接口'],
  },
];
</script>
