<template>
  <section class="vtp-page px-0 py-10">
    <div class="vtp-panel rounded-[2rem] p-6 md:p-10">
      <p class="vtp-kicker">{{ t('pricing.kicker') }}</p>
      <h1 class="vtp-title mt-4 max-w-[12ch]">{{ t('pricing.title') }}</h1>
      <p class="vtp-body mt-4 max-w-3xl">
        {{ t('pricing.subtitle') }}
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
        <h2 class="font-[var(--font-display)] text-2xl font-semibold text-white">{{ t('pricing.compareTitle') }}</h2>
        <p class="mt-2 text-sm text-slate-300">{{ t('pricing.compareDesc') }}</p>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full border-collapse text-left text-sm text-slate-200">
          <thead>
            <tr class="bg-white/5 text-xs uppercase tracking-[0.16em] text-slate-400">
              <th class="px-6 py-4">{{ t('pricing.table.feature') }}</th>
              <th class="px-6 py-4">{{ t('pricing.table.free') }}</th>
              <th class="px-6 py-4">{{ t('pricing.table.pro') }}</th>
              <th class="px-6 py-4">{{ t('pricing.table.enterprise') }}</th>
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
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

interface PricingPlan {
  name: string;
  price: string;
  description: string;
  highlights: string[];
  cta: string;
  route: string;
}

interface PricingCompareRow {
  feature: string;
  free: string;
  pro: string;
  enterprise: string;
}

const { t, tm } = useI18n();

const plans = computed<PricingPlan[]>(() => tm('pricing.plans') as PricingPlan[]);
const compareRows = computed<PricingCompareRow[]>(() => tm('pricing.rows') as PricingCompareRow[]);
</script>
