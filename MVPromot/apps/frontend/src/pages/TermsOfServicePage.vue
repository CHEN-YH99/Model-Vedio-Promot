<template>
  <section class="vtp-page px-0 py-8 sm:py-10">
    <article class="vtp-panel rounded-[2rem] p-6 md:p-10">
      <p class="vtp-kicker">{{ t('terms.kicker') }}</p>
      <h1 class="vtp-title mt-4 max-w-[14ch]">{{ t('terms.title') }}</h1>
      <p class="vtp-body mt-4 text-sm leading-7 text-slate-200">
        {{ t('terms.effectiveDate') }}
      </p>

      <div class="mt-8 space-y-6 text-sm leading-7 text-slate-200">
        <section v-for="(item, index) in sections" :key="`terms-${index}`">
          <h2 class="text-lg font-semibold text-white">{{ item.title }}</h2>
          <p class="mt-2">{{ item.body }}</p>
        </section>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

interface TermsSection {
  title: string;
  body: string;
}

const { t, tm } = useI18n();
const sections = computed<TermsSection[]>(() => tm('terms.sections') as TermsSection[]);
</script>
