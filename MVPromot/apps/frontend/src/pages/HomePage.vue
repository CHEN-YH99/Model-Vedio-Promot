<template>
  <div ref="pageRef" class="home-page">
    <section class="hero-scene" data-hero-scene>
      <div class="hero-scene__stage" aria-hidden="true">
        <img
          class="hero-scene__layer hero-scene__layer--bg"
          data-layer="bg"
          src="/images/backgrounds/s01_hero_bg.webp"
          alt=""
          loading="eager"
          decoding="async"
          fetchpriority="high"
        />
        <img
          class="hero-scene__layer hero-scene__layer--mid"
          data-layer="mid"
          src="/images/backgrounds/s01_hero_mid.png"
          alt=""
          loading="eager"
          decoding="async"
          fetchpriority="high"
        />
        <img
          class="hero-scene__layer hero-scene__layer--fg"
          data-layer="fg"
          src="/images/backgrounds/s01_hero_fg.png"
          alt=""
          loading="eager"
          decoding="async"
        />
        <div class="hero-scene__shade"></div>
        <div class="hero-scene__beam"></div>
        <div class="hero-scene__wash"></div>
      </div>

      <div class="hero-scene__content vtp-page">
        <div class="hero-copy">
          <p class="vtp-kicker">Narrative Landing Page</p>
          <h1 class="vtp-title hero-copy__title">
            <span class="hero-copy__mask"><span data-mask-line>Turn reference video</span></span>
            <span class="hero-copy__mask"><span data-mask-line>into camera language</span></span>
            <span class="hero-copy__mask"><span data-mask-line>for video models</span></span>
          </h1>
          <p class="vtp-body hero-copy__body">
            The landing page is now a public story-driven experience. Hero already uses real
            `bg / mid / fg` assets. The next scenes keep clear placeholders so later assets can be
            swapped in without rebuilding layout rhythm.
          </p>
          <div class="hero-copy__actions">
            <a v-if="authStore.isAuthenticated" class="vtp-button" href="#launch-pad">
              Start Upload
            </a>
            <RouterLink v-else class="vtp-button" :to="loginLink">Login To Start</RouterLink>
            <a class="vtp-button vtp-button--ghost" href="#story-grid">View Story Flow</a>
          </div>

          <div class="hero-stats">
            <article v-for="item in stats" :key="item.label" class="hero-stats__item vtp-panel">
              <p class="hero-stats__value">{{ item.value }}</p>
              <p class="hero-stats__label">{{ item.label }}</p>
              <p class="hero-stats__text">{{ item.text }}</p>
            </article>
          </div>
        </div>

        <div class="hero-stack">
          <article v-for="item in heroCards" :key="item.id" class="hero-stack__card vtp-panel" data-hero-card>
            <p class="hero-stack__index">{{ item.id }}</p>
            <h2>{{ item.title }}</h2>
            <p>{{ item.text }}</p>
            <span class="vtp-chip">{{ item.tag }}</span>
          </article>
        </div>
      </div>
    </section>

    <section id="story-grid" class="section-block">
      <div class="vtp-page">
        <div class="section-head" data-reveal>
          <p class="vtp-kicker">Story Grid</p>
          <h2 class="vtp-title section-head__title">Structure first, assets later.</h2>
          <p class="vtp-body">
            This page now reserves clear slots for the next scenes. No more patchwork cards without
            sequencing. When new section assets arrive, they can replace stage layers directly.
          </p>
        </div>

        <div class="feature-grid">
          <article v-for="item in features" :key="item.title" class="feature-card vtp-panel" data-reveal>
            <span class="vtp-chip">{{ item.tag }}</span>
            <h3>{{ item.title }}</h3>
            <p>{{ item.text }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="section-block section-block--soft">
      <div class="vtp-page workflow-grid">
        <div class="section-head" data-reveal>
          <p class="vtp-kicker">Workflow</p>
          <h2 class="vtp-title section-head__title">Show the pipeline before asking for trust.</h2>
          <p class="vtp-body">
            Upload, analysis config, progress tracking, and result review are now framed as one
            continuous product story instead of isolated screens.
          </p>

          <div class="workflow-list">
            <article v-for="item in workflow" :key="item.title" class="workflow-list__item vtp-panel" data-reveal>
              <p class="workflow-list__kicker">{{ item.kicker }}</p>
              <h3>{{ item.title }}</h3>
              <p>{{ item.text }}</p>
            </article>
          </div>
        </div>

        <div class="workflow-stage" data-reveal>
          <div class="workflow-stage__media vtp-panel">
            <video
              class="workflow-stage__video"
              src="/images/backgrounds/vediopromot.mp4"
              autoplay
              muted
              loop
              playsinline
              preload="metadata"
            ></video>
          </div>

          <article class="workflow-stage__console vtp-panel">
            <p class="workflow-stage__eyebrow">Prompt Console</p>
            <p class="workflow-stage__code">
              slow push in, cinematic control room, holographic cube streaming multi-scene video
              frames, volumetric blue light, reflective metal floor
            </p>
            <p class="workflow-stage__hint">
              Placeholder scenes are ready for future `focus / network / compare / cta` assets.
            </p>
          </article>
        </div>
      </div>
    </section>

    <section class="section-block">
      <div class="vtp-page section-grid">
        <div class="section-head" data-reveal>
          <p class="vtp-kicker">Platform Network</p>
          <h2 class="vtp-title section-head__title">One analysis core, multiple output voices.</h2>
          <p class="vtp-body">
            Sora, Runway, Kling, Pika, Wan, and Hailuo sit on one conversion network. The vector
            stage below is a clean placeholder until the dedicated network scene assets arrive.
          </p>
        </div>

        <article class="network-stage vtp-panel" data-reveal>
          <div class="network-stage__rings" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </div>

          <div class="network-stage__core">
            <p>Prompt Core</p>
            <strong>Frame Analysis Bus</strong>
            <small>Scene tags, motion tags, style tags, prompt templates</small>
          </div>

          <div
            v-for="(item, index) in integrations"
            :key="item.name"
            class="network-stage__node"
            :style="nodeStyle(index)"
          >
            <strong>{{ item.name }}</strong>
            <small>{{ item.text }}</small>
          </div>
        </article>
      </div>
    </section>

    <section id="launch-pad" class="section-block section-block--soft">
      <div class="vtp-page launch-grid">
        <div class="section-head" data-reveal>
          <p class="vtp-kicker">Launch Pad</p>
          <h2 class="vtp-title section-head__title">Upload and analysis entry now live on the home page.</h2>
          <p class="vtp-body">
            Guests can view the product story. Auth-only analysis actions are guarded inside the
            upload module, so the entry point is public while the protected flow stays clean.
          </p>
        </div>

        <div class="launch-grid__panel" data-reveal>
          <UploadZone />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

import UploadZone from '@/components/UploadZone.vue';
import { useAuthStore } from '@/stores/auth';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({
  ignoreMobileResize: true,
});

const authStore = useAuthStore();
const pageRef = ref<HTMLElement | null>(null);

let context: gsap.Context | null = null;
let media: gsap.MatchMedia | null = null;
let lowPerformanceMode = false;
let deferredSetupTimer: number | null = null;
let deferredSetupIdleId: number | null = null;

const loginLink = computed(() => ({
  path: '/login',
  query: {
    redirect: '/',
  },
}));

const stats = [
  { value: '6', label: 'Platform Outputs', text: 'Sora, Runway, Kling, Pika, Wan, Hailuo' },
  { value: 'Hero Ready', label: 'Real Assets', text: 'The first screen already uses the provided layered visuals' },
  { value: 'Public Home', label: 'Open Access', text: 'Guests can browse the landing page without forced auth' },
];

const heroCards = [
  { id: '01', title: 'Ingest', text: 'Local upload and URL import are unified at the entrance layer.', tag: 'Input Gate' },
  { id: '02', title: 'Analyze', text: 'Frames, motion, mood, and scene structure are normalized before output.', tag: 'Analysis Core' },
  { id: '03', title: 'Rewrite', text: 'Prompt wording changes by platform while keeping visual intent stable.', tag: 'Prompt Rewrite' },
];

const features = [
  { tag: 'Section 02', title: 'Scene placeholders already reserved', text: 'Future assets can be dropped into clear stage slots instead of forcing layout rewrites.' },
  { tag: 'Section 03', title: 'Homepage now tells the actual product story', text: 'The product flow is visible before upload so users understand what happens next.' },
  { tag: 'Section 04', title: 'Navigation already includes future pages', text: 'Pricing, history, profile, and share routes are in place before backend completion.' },
];

const workflow = [
  { kicker: 'Frame Selection', title: 'Keep sampling readable', text: 'Scene switching plus interval sampling prevents the result page from turning into noise.' },
  { kicker: 'Prompt Structuring', title: 'Normalize camera language', text: 'Subject, scene, light, color, motion, and lens instructions stay in one shared structure.' },
  { kicker: 'Review Surface', title: 'Result page stays the editing hub', text: 'The landing page sells the flow. The result page keeps copy, export, and follow-up actions.' },
];

const integrations = [
  { name: 'Sora', text: 'Natural language' },
  { name: 'Runway', text: 'Lens-first phrasing' },
  { name: 'Kling', text: 'Chinese motion bias' },
  { name: 'Pika', text: 'Compact prompts' },
  { name: 'Wan', text: 'Bilingual structure' },
  { name: 'Hailuo', text: 'Mood-heavy output' },
];

function nodeStyle(index: number) {
  const angle = index * 60;
  const radius = index % 2 === 0 ? 11.5 : 13.5;

  return {
    transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${radius}rem) rotate(-${angle}deg)`,
  };
}

function shouldUseLightMotion() {
  if (typeof window === 'undefined') {
    return false;
  }

  const navigatorWithHints = window.navigator as Navigator & {
    deviceMemory?: number;
  };
  const memory = navigatorWithHints.deviceMemory ?? 8;
  const cores = navigatorWithHints.hardwareConcurrency ?? 8;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;

  return prefersReducedMotion || coarsePointer || memory <= 4 || cores <= 6;
}

function waitForStablePaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

function clearDeferredSetup() {
  if (deferredSetupTimer !== null) {
    window.clearTimeout(deferredSetupTimer);
    deferredSetupTimer = null;
  }

  const windowWithIdleCallback = window as Window & {
    cancelIdleCallback?: (handle: number) => void;
  };

  if (deferredSetupIdleId !== null && windowWithIdleCallback.cancelIdleCallback) {
    windowWithIdleCallback.cancelIdleCallback(deferredSetupIdleId);
    deferredSetupIdleId = null;
  }
}

function scheduleDeferredSetup(task: () => void) {
  clearDeferredSetup();

  const windowWithIdleCallback = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  };

  if (windowWithIdleCallback.requestIdleCallback) {
    deferredSetupIdleId = windowWithIdleCallback.requestIdleCallback(
      () => {
        deferredSetupIdleId = null;
        task();
      },
      { timeout: lowPerformanceMode ? 480 : 320 },
    );
    return;
  }

  deferredSetupTimer = window.setTimeout(() => {
    deferredSetupTimer = null;
    task();
  }, lowPerformanceMode ? 180 : 96);
}

function setupAnimations() {
  const root = pageRef.value;
  if (!root) {
    return;
  }

  lowPerformanceMode = shouldUseLightMotion();

  context = gsap.context(() => {
    const maskLines = root.querySelectorAll<HTMLElement>('[data-mask-line]');
    const introTargets = root.querySelectorAll<HTMLElement>(
      '.hero-copy__body, .hero-copy__actions, .hero-stats__item',
    );
    const revealTargets = root.querySelectorAll<HTMLElement>('[data-reveal]');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let deferredAnimationsInitialized = false;

    const initializeDeferredAnimations = () => {
      if (deferredAnimationsInitialized || prefersReducedMotion) {
        return;
      }

      deferredAnimationsInitialized = true;

      revealTargets.forEach((target) => {
        gsap.set(target, { force3D: true });

        gsap.fromTo(
          target,
          {
            y: lowPerformanceMode ? 26 : 50,
            autoAlpha: 0,
            scale: lowPerformanceMode ? 1 : 0.985,
          },
          {
            y: 0,
            autoAlpha: 1,
            scale: 1,
            duration: lowPerformanceMode ? 0.72 : 0.9,
            ease: 'power3.out',
            force3D: true,
            scrollTrigger: {
              trigger: target,
              start: 'top 84%',
              once: true,
            },
          },
        );
      });

      media = gsap.matchMedia();

      media.add('(min-width: 960px) and (prefers-reduced-motion: no-preference)', () => {
        const heroScene = root.querySelector<HTMLElement>('[data-hero-scene]');
        const bg = root.querySelector<HTMLElement>('[data-layer="bg"]');
        const mid = root.querySelector<HTMLElement>('[data-layer="mid"]');
        const fg = root.querySelector<HTMLElement>('[data-layer="fg"]');
        const beam = root.querySelector<HTMLElement>('.hero-scene__beam');
        const wash = root.querySelector<HTMLElement>('.hero-scene__wash');
        const cards = gsap.utils.toArray<HTMLElement>('[data-hero-card]');

        if (!heroScene || !bg || !mid || !fg || cards.length < 3) {
          return;
        }

        const heroMotion = lowPerformanceMode
          ? {
              end: '+=165%',
              scrub: 0.6,
              bgY: -4,
              bgScale: 1.03,
              midY: -8,
              midX: -1,
              midScale: 1.05,
              fgY: -12,
              fgX: 3,
              fgScale: 1.07,
              beamOpacity: 0.56,
              washPeak: 0.42,
              washEnd: 0.06,
            }
          : {
              end: '+=190%',
              scrub: 0.9,
              bgY: -6,
              bgScale: 1.05,
              midY: -12,
              midX: -1.5,
              midScale: 1.08,
              fgY: -18,
              fgX: 5,
              fgScale: 1.1,
              beamOpacity: 0.82,
              washPeak: 0.72,
              washEnd: 0.14,
            };

        gsap.set([bg, mid, fg, beam, wash, ...cards], { force3D: true });
        gsap.set(cards.slice(1), { autoAlpha: 0, yPercent: 12, force3D: true });

        gsap
          .timeline({
            defaults: {
              ease: 'none',
              force3D: true,
            },
            scrollTrigger: {
              trigger: heroScene,
              start: 'top top',
              end: heroMotion.end,
              scrub: heroMotion.scrub,
              pin: true,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          })
          .to(bg, { yPercent: heroMotion.bgY, scale: heroMotion.bgScale, duration: 3 }, 0)
          .to(mid, { yPercent: heroMotion.midY, xPercent: heroMotion.midX, scale: heroMotion.midScale, duration: 3 }, 0)
          .to(fg, { yPercent: heroMotion.fgY, xPercent: heroMotion.fgX, scale: heroMotion.fgScale, duration: 3 }, 0)
          .fromTo(
            beam,
            { autoAlpha: 0.18, scaleX: 0.78 },
            { autoAlpha: heroMotion.beamOpacity, scaleX: 1.04, duration: 0.88 },
            0.18,
          )
          .to(cards[0], { autoAlpha: 0, yPercent: -10, duration: 0.5 }, 0.78)
          .fromTo(cards[1], { autoAlpha: 0, yPercent: 12 }, { autoAlpha: 1, yPercent: 0, duration: 0.65 }, 0.86)
          .to(cards[1], { autoAlpha: 0, yPercent: -10, duration: 0.5 }, 1.54)
          .fromTo(cards[2], { autoAlpha: 0, yPercent: 12 }, { autoAlpha: 1, yPercent: 0, duration: 0.65 }, 1.62)
          .to(wash, { autoAlpha: heroMotion.washPeak, duration: 0.18 }, 1.44)
          .to(wash, { autoAlpha: heroMotion.washEnd, duration: 0.3 }, 1.74);
      });

      media.add('(max-width: 959px) and (prefers-reduced-motion: no-preference)', () => {
        const bg = root.querySelector<HTMLElement>('[data-layer="bg"]');
        const mid = root.querySelector<HTMLElement>('[data-layer="mid"]');
        const fg = root.querySelector<HTMLElement>('[data-layer="fg"]');

        if (!bg || !mid || !fg) {
          return;
        }

        gsap.set([bg, mid, fg], { force3D: true });

        if (lowPerformanceMode) {
          gsap.set(bg, { yPercent: -1.5, scale: 1.01 });
          gsap.set(mid, { yPercent: -2.5, scale: 1.02 });
          gsap.set(fg, { yPercent: -3.5, xPercent: 1.2, scale: 1.03 });
          return;
        }

        gsap.to(bg, {
          yPercent: -2.2,
          scale: 1.02,
          duration: 7.2,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          force3D: true,
        });
        gsap.to(mid, {
          yPercent: -3.4,
          scale: 1.03,
          duration: 8.4,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          force3D: true,
        });
        gsap.to(fg, {
          yPercent: -4.6,
          xPercent: 1.6,
          scale: 1.04,
          duration: 9.6,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          force3D: true,
        });
      });

      ScrollTrigger.refresh();
    };

    gsap.set(maskLines, {
      yPercent: 110,
      force3D: true,
      willChange: 'transform',
    });
    gsap.set(introTargets, {
      force3D: true,
      willChange: 'transform, opacity',
    });

    const introTimeline = gsap
      .timeline({ defaults: { ease: 'power3.out' } })
      .to(maskLines, {
        yPercent: 0,
        duration: lowPerformanceMode ? 0.66 : 0.78,
        stagger: lowPerformanceMode ? 0.04 : 0.06,
      })
      .fromTo(
        introTargets,
        {
          y: lowPerformanceMode ? 14 : 20,
          autoAlpha: 0,
          scale: 0.992,
        },
        {
          y: 0,
          autoAlpha: 1,
          scale: 1,
          duration: lowPerformanceMode ? 0.56 : 0.68,
          stagger: lowPerformanceMode ? 0.04 : 0.06,
          force3D: true,
        },
        0.12,
      );

    if (prefersReducedMotion) {
      gsap.set(revealTargets, {
        autoAlpha: 1,
        clearProps: 'transform',
      });
      gsap.set(maskLines, { clearProps: 'willChange' });
      gsap.set(introTargets, { clearProps: 'willChange' });
      return;
    }

    introTimeline.eventCallback('onComplete', () => {
      gsap.set(maskLines, { clearProps: 'willChange' });
      gsap.set(introTargets, { clearProps: 'willChange' });

      scheduleDeferredSetup(() => {
        if (!context || pageRef.value !== root) {
          return;
        }

        context.add(() => {
          initializeDeferredAnimations();
        });
      });
    });
  });
}

onMounted(async () => {
  await nextTick();
  await waitForStablePaint();
  setupAnimations();
});

onBeforeUnmount(() => {
  clearDeferredSetup();
  media?.revert();
  context?.revert();
  media = null;
  context = null;
});
</script>

<style scoped>
.home-page {
  position: relative;
  overflow-x: clip;
  padding-bottom: 4rem;
}

.section-block {
  padding: clamp(4.5rem, 10vw, 7rem) 0;
}

.section-block--soft {
  background: linear-gradient(180deg, rgba(6, 10, 18, 0.5), rgba(6, 10, 18, 0));
}

.section-head {
  display: grid;
  gap: 1.1rem;
  max-width: 46rem;
}

.section-head__title {
  max-width: 14ch;
}

.hero-scene {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
}

.hero-scene__stage {
  position: absolute;
  inset: 0;
  contain: paint;
  isolation: isolate;
  transform: translateZ(0);
}

.hero-scene__layer {
  position: absolute;
  inset: -5%;
  width: 110%;
  height: 110%;
  backface-visibility: hidden;
  object-fit: cover;
  transform: translateZ(0);
  will-change: transform;
}

.hero-scene__shade {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(3, 6, 12, 0.3), rgba(3, 6, 12, 0.72) 74%, rgba(3, 6, 12, 0.92)),
    radial-gradient(circle at 24% 24%, rgba(122, 226, 255, 0.18), transparent 24%);
}

.hero-scene__beam {
  position: absolute;
  top: 50%;
  left: 18%;
  width: 56%;
  height: 1rem;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.92), transparent);
  filter: blur(6px);
  opacity: 0.3;
  transform: translateZ(0);
  transform-origin: left center;
  will-change: transform, opacity;
}

.hero-scene__wash {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(120deg, rgba(255, 255, 255, 0.24), transparent 32%, rgba(122, 226, 255, 0.2) 68%, transparent),
    radial-gradient(circle at center, rgba(255, 255, 255, 0.18), transparent 52%);
  opacity: 0;
  transform: translateZ(0);
  will-change: opacity;
}

.hero-scene__content {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(22rem, 0.9fr);
  align-items: end;
  gap: clamp(2rem, 4vw, 4rem);
  min-height: 100vh;
  padding-top: clamp(7rem, 16vh, 10rem);
  padding-bottom: 3rem;
}

.hero-copy {
  display: grid;
  gap: 1.3rem;
  max-width: 42rem;
}

.hero-copy__title {
  display: grid;
  gap: 0.12em;
  max-width: 11ch;
  contain: paint;
}

.hero-copy__mask {
  display: block;
  contain: paint;
  overflow: hidden;
}

.hero-copy__mask span {
  backface-visibility: hidden;
  display: block;
  transform: translateZ(0);
}

.hero-copy__body {
  max-width: 34rem;
}

.hero-copy__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.95rem;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.hero-stats__item,
.hero-stack__card,
.feature-card,
.workflow-list__item,
.workflow-stage__console,
.network-stage,
.cta-card {
  border-radius: 1.6rem;
}

.hero-stats__item {
  display: grid;
  gap: 0.65rem;
  padding: 1.15rem;
}

.hero-stats__value,
.hero-stats__label,
.hero-stats__text,
.hero-stack__index,
.hero-stack__card h2,
.hero-stack__card p,
.feature-card h3,
.feature-card p,
.workflow-list__kicker,
.workflow-list__item h3,
.workflow-list__item p,
.workflow-stage__eyebrow,
.workflow-stage__code,
.workflow-stage__hint,
.network-stage__core p,
.network-stage__core strong,
.network-stage__core small,
.network-stage__node strong,
.network-stage__node small {
  margin: 0;
}

.hero-stats__value {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 600;
}

.hero-stats__label {
  color: #ffffff;
  font-weight: 600;
}

.hero-stats__text,
.hero-stack__card p,
.feature-card p,
.workflow-list__item p,
.workflow-stage__hint,
.network-stage__core small,
.network-stage__node small {
  color: rgba(214, 223, 244, 0.72);
  line-height: 1.7;
}

.hero-stack {
  position: relative;
  min-height: 22rem;
}

.hero-stack__card {
  position: absolute;
  inset: 0;
  display: grid;
  gap: 0.9rem;
  align-content: start;
  padding: 1.4rem;
  transform: translateZ(0);
  will-change: transform, opacity;
}

.hero-stack__index,
.workflow-list__kicker,
.workflow-stage__eyebrow {
  color: rgba(122, 226, 255, 0.82);
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.hero-stack__card h2,
.feature-card h3,
.workflow-list__item h3 {
  color: #ffffff;
  font-family: var(--font-display);
  font-size: 1.45rem;
  font-weight: 600;
  line-height: 1.18;
}

.feature-grid,
.workflow-list {
  display: grid;
  gap: 1rem;
  margin-top: 2rem;
}

.feature-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.feature-card,
.workflow-list__item {
  display: grid;
  gap: 0.9rem;
  padding: 1.25rem;
}

.workflow-grid,
.section-grid,
.launch-grid {
  display: grid;
  gap: 1.5rem;
  align-items: center;
}

.workflow-grid,
.section-grid,
.launch-grid {
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
}

.workflow-stage {
  display: grid;
  gap: 1rem;
}

.workflow-stage__media {
  border-radius: 1.8rem;
  padding: 1rem;
}

.workflow-stage__video {
  width: 100%;
  aspect-ratio: 16 / 10;
  border-radius: 1.3rem;
  border: 1px solid rgba(140, 167, 255, 0.16);
  object-fit: cover;
}

.workflow-stage__console {
  display: grid;
  gap: 0.8rem;
  width: min(100%, 24rem);
  margin-top: -4rem;
  margin-left: auto;
  padding: 1rem;
}

.workflow-stage__code {
  color: #ffffff;
  line-height: 1.75;
}

.network-stage {
  position: relative;
  min-height: 34rem;
  overflow: hidden;
  padding: 1.4rem;
}

.network-stage__rings span {
  position: absolute;
  top: 50%;
  left: 50%;
  border: 1px solid rgba(122, 226, 255, 0.18);
  border-radius: 999px;
  transform: translate(-50%, -50%);
}

.network-stage__rings span:nth-child(1) {
  width: 16rem;
  height: 16rem;
}

.network-stage__rings span:nth-child(2) {
  width: 22rem;
  height: 22rem;
}

.network-stage__rings span:nth-child(3) {
  width: 28rem;
  height: 28rem;
  opacity: 0.6;
}

.network-stage__core {
  position: absolute;
  top: 50%;
  left: 50%;
  display: grid;
  gap: 0.4rem;
  width: min(18rem, 74%);
  padding: 1.1rem;
  border-radius: 1.4rem;
  border: 1px solid rgba(122, 226, 255, 0.22);
  background:
    linear-gradient(180deg, rgba(122, 226, 255, 0.14), rgba(122, 226, 255, 0.04)),
    rgba(9, 16, 30, 0.8);
  text-align: center;
  transform: translate(-50%, -50%);
}

.network-stage__core strong {
  color: #ffffff;
  font-family: var(--font-display);
  font-size: 1.2rem;
}

.network-stage__node {
  position: absolute;
  top: 50%;
  left: 50%;
  display: grid;
  gap: 0.2rem;
  min-width: 8.5rem;
  padding: 0.85rem;
  border-radius: 1.1rem;
  border: 1px solid rgba(140, 167, 255, 0.16);
  background: rgba(255, 255, 255, 0.04);
  text-align: center;
}

.network-stage__node strong {
  color: #ffffff;
  font-size: 0.95rem;
}

.launch-grid__panel :deep(section) {
  border-radius: 1.8rem;
  border-color: rgba(140, 167, 255, 0.16);
  background: rgba(8, 14, 26, 0.72);
}

@media (max-width: 1180px) {
  .hero-scene__content,
  .workflow-grid,
  .section-grid,
  .launch-grid {
    grid-template-columns: 1fr;
  }

  .workflow-stage__console {
    width: 100%;
    margin-top: 0;
  }
}

@media (max-width: 959px) {
  .hero-scene {
    min-height: auto;
  }

  .hero-scene__beam,
  .hero-scene__wash {
    display: none;
  }

  .hero-scene__content {
    min-height: auto;
    padding-top: 7rem;
    padding-bottom: 4rem;
  }

  .hero-stats,
  .feature-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .hero-copy__title,
  .section-head__title {
    max-width: none;
  }

  .hero-copy__actions {
    display: grid;
  }

  .hero-stats,
  .feature-grid {
    grid-template-columns: 1fr;
  }

  .hero-stack {
    min-height: 20rem;
  }

  .network-stage {
    min-height: 27rem;
  }

  .network-stage__rings span:nth-child(1) {
    width: 11rem;
    height: 11rem;
  }

  .network-stage__rings span:nth-child(2) {
    width: 15rem;
    height: 15rem;
  }

  .network-stage__rings span:nth-child(3) {
    width: 20rem;
    height: 20rem;
  }

  .network-stage__node {
    min-width: 6.8rem;
    padding: 0.6rem;
  }
}
</style>
