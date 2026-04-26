<template>
  <article
    class="rounded-3xl border border-emerald-400/40 bg-emerald-400/5 p-8 shadow-[0_0_50px_-20px_rgba(52,211,153,0.35)]"
  >
    <p class="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">System Ready</p>
    <h2 class="mt-3 text-3xl font-bold text-emerald-100">{{ t('helloCard.title') }}</h2>
    <p class="mt-4 text-zinc-200">
      {{ t('helloCard.body') }}
    </p>
  </article>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>
