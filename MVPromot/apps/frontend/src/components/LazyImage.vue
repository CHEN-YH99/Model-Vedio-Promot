<template>
  <div :class="wrapperClass">
    <div
      v-if="!loaded"
      class="absolute inset-0 animate-pulse rounded-[inherit] bg-gradient-to-r from-white/5 via-white/10 to-white/5"
      aria-hidden="true"
    ></div>

    <img
      ref="imageRef"
      :src="resolvedSrc"
      :alt="alt"
      :class="imageClass"
      loading="lazy"
      decoding="async"
      @load="handleLoad"
      @error="handleError"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const props = withDefaults(
  defineProps<{
    src: string;
    alt?: string;
    imageClass?: string;
    wrapperClass?: string;
    rootMargin?: string;
  }>(),
  {
    alt: '',
    imageClass: '',
    wrapperClass: 'relative overflow-hidden',
    rootMargin: '160px',
  },
);

const imageRef = ref<HTMLImageElement | null>(null);
const observed = ref(false);
const loaded = ref(false);
const hasError = ref(false);
let observer: IntersectionObserver | null = null;

const resolvedSrc = computed(() => {
  if (!observed.value || hasError.value) {
    return '';
  }

  return props.src;
});

function disconnectObserver() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

function startObserve() {
  const element = imageRef.value;

  if (!element) {
    return;
  }

  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    observed.value = true;
    return;
  }

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) {
          continue;
        }

        observed.value = true;
        disconnectObserver();
        break;
      }
    },
    {
      root: null,
      rootMargin: props.rootMargin,
      threshold: 0.01,
    },
  );

  observer.observe(element);
}

function handleLoad() {
  loaded.value = true;
}

function handleError() {
  loaded.value = true;
  hasError.value = true;
}

onMounted(() => {
  startObserve();
});

onBeforeUnmount(() => {
  disconnectObserver();
});
</script>
