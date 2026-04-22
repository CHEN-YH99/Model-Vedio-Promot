<template>
  <section class="vtp-page px-0 py-10">
    <div class="vtp-panel rounded-[2rem] p-6 md:p-10">
      <p class="vtp-kicker">Pricing</p>
      <h1 class="vtp-title mt-4 max-w-[12ch]">定价页先立住，后续支付链路再接。</h1>
      <p class="vtp-body mt-4 max-w-3xl">
        文档里免费、Pro、企业的边界已经写死了，前端先把结构搭好才是正路。等订阅、账单和支付回调接进来，直接往现有卡片和对比表里填，不用再推翻一次。
      </p>
    </div>

    <div class="mt-6 grid gap-4 xl:grid-cols-3">
      <article
        v-for="plan in plans"
        :key="plan.name"
        class="vtp-panel flex h-full flex-col rounded-[1.75rem] p-6"
      >
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/80">
          {{ plan.name }}
        </p>
        <h2 class="mt-4 font-[var(--font-display)] text-4xl font-semibold text-white">
          {{ plan.price }}
        </h2>
        <p class="mt-4 text-sm leading-7 text-slate-300">{{ plan.description }}</p>

        <div class="mt-5 flex flex-wrap gap-2">
          <span
            v-for="item in plan.highlights"
            :key="item"
            class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200"
          >
            {{ item }}
          </span>
        </div>

        <RouterLink class="vtp-button mt-6" :to="plan.route">{{ plan.cta }}</RouterLink>
      </article>
    </div>

    <div class="vtp-panel mt-6 overflow-hidden rounded-[2rem]">
      <div class="border-b border-white/10 px-6 py-5">
        <h2 class="font-[var(--font-display)] text-2xl font-semibold text-white">功能对比</h2>
        <p class="mt-2 text-sm text-slate-300">支付、账单和企业定制还没接完，表格先把边界讲清楚。</p>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full border-collapse text-left text-sm text-slate-200">
          <thead>
            <tr class="bg-white/5 text-xs uppercase tracking-[0.16em] text-slate-400">
              <th class="px-6 py-4">能力项</th>
              <th class="px-6 py-4">Free</th>
              <th class="px-6 py-4">Pro</th>
              <th class="px-6 py-4">Enterprise</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in compareRows" :key="row.feature" class="border-t border-white/10">
              <td class="px-6 py-4 font-medium text-white">{{ row.feature }}</td>
              <td class="px-6 py-4">{{ row.free }}</td>
              <td class="px-6 py-4">{{ row.pro }}</td>
              <td class="px-6 py-4">{{ row.enterprise }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const plans = [
  {
    name: 'FREE',
    price: '免费',
    description: '每天 3 次，适合试流程、看效果、确认这工具是不是你的菜。',
    highlights: ['100MB 上传', '英文提示词', '基础结果页'],
    cta: '注册试用',
    route: '/register',
  },
  {
    name: 'PRO',
    price: '¥49 / 月',
    description: '适合高频创作者，拿走中英双语、历史记录、导出和更长视频时长。',
    highlights: ['无限分析', '30 分钟视频', '导出与历史记录'],
    cta: '回首页开始',
    route: '/',
  },
  {
    name: 'ENTERPRISE',
    price: '定制报价',
    description: '给团队和平台侧准备，预留 API、批量任务、自定义模板和私有部署。',
    highlights: ['API Key', '批量处理', '私有部署'],
    cta: '查看首页方案',
    route: '/',
  },
];

const compareRows = [
  {
    feature: '每日配额',
    free: '3 次',
    pro: '无限',
    enterprise: '按合同配置',
  },
  {
    feature: '视频长度',
    free: '轻量试用',
    pro: '≤ 30 分钟',
    enterprise: '自定义',
  },
  {
    feature: '语言输出',
    free: '英文',
    pro: '中 / 英 / 双语',
    enterprise: '可扩展模板',
  },
  {
    feature: '历史记录',
    free: '无',
    pro: '有',
    enterprise: '有',
  },
  {
    feature: '导出与分享',
    free: '基础复制',
    pro: 'TXT / JSON / 分享链接',
    enterprise: '企业级交付',
  },
];
</script>
