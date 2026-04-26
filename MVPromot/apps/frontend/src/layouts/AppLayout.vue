<template>
  <div class="shell">
    <div class="shell__ambient" aria-hidden="true">
      <div class="shell__orb shell__orb--left"></div>
      <div class="shell__orb shell__orb--right"></div>
      <div class="shell__grid"></div>
    </div>

    <header class="shell__header" :class="{ 'shell__header--home': isHome }">
      <div class="shell__header-inner vtp-page">
        <RouterLink class="brand" to="/">
          <span class="brand__mark">VP</span>
          <span class="brand__text">
            <strong>Video To Prompt</strong>
            <small>{{ t('layout.brandSubtitle') }}</small>
          </span>
        </RouterLink>

        <nav class="nav" :aria-label="t('layout.nav.home')">
          <RouterLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="nav__link"
            :class="{ 'is-active': isRouteActive(item.to) }"
          >
            {{ item.label }}
          </RouterLink>
        </nav>

        <div class="actions">
          <div ref="localePickerRef" class="locale-picker" :aria-label="t('locale.label')">
            <button
              type="button"
              class="locale-picker__trigger"
              :aria-expanded="localePanelOpen ? 'true' : 'false'"
              @click="toggleLocalePanel"
            >
              <Languages class="locale-picker__icon" :size="16" />
              <span class="locale-picker__label">{{ t('locale.label') }}</span>
              <span class="locale-picker__code">{{ currentLocaleCode }}</span>
            </button>

            <div v-if="localePanelOpen" class="locale-picker__panel">
              <button
                v-for="option in localeOptions"
                :key="option.value"
                type="button"
                class="locale-picker__option"
                :class="{ 'is-active': currentLocale === option.value }"
                @click="changeLocale(option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>

          <span v-if="authStore.isAuthenticated" class="actions__user">{{ authStore.user?.email }}</span>

          <template v-if="authStore.isAuthenticated">
            <button type="button" class="vtp-button vtp-button--ghost" @click="handleLogout">
              {{ t('layout.actions.logout') }}
            </button>
          </template>
          <template v-else>
            <RouterLink class="vtp-button vtp-button--ghost" :to="loginLink">
              {{ t('layout.actions.login') }}
            </RouterLink>
            <RouterLink class="vtp-button" to="/register">{{ t('layout.actions.register') }}</RouterLink>
          </template>

          <button type="button" class="menu-button" :aria-expanded="menuOpen ? 'true' : 'false'" @click="menuOpen = !menuOpen">
            {{ t('layout.actions.menu') }}
          </button>
        </div>
      </div>

      <div v-if="menuOpen" class="drawer vtp-page">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="drawer__link"
          @click="menuOpen = false"
        >
          {{ item.label }}
        </RouterLink>

        <template v-if="authStore.isAuthenticated">
          <button type="button" class="drawer__link" @click="handleLogout">{{ t('layout.actions.logout') }}</button>
        </template>
        <template v-else>
          <RouterLink class="drawer__link" :to="loginLink" @click="menuOpen = false">{{ t('layout.actions.login') }}</RouterLink>
          <RouterLink class="drawer__link" to="/register" @click="menuOpen = false">{{ t('layout.actions.register') }}</RouterLink>
        </template>
        <div class="drawer__locale">
          <button
            v-for="option in localeOptions"
            :key="`drawer-${option.value}`"
            type="button"
            class="drawer__locale-button"
            :class="{ 'is-active': currentLocale === option.value }"
            @click="changeLocale(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
    </header>

    <main class="shell__main" :class="{ 'shell__main--home': isHome }">
      <RouterView />
      <footer class="shell__footer vtp-page">
        <RouterLink class="shell__footer-link" to="/privacy">{{ t('layout.footer.privacy') }}</RouterLink>
        <RouterLink class="shell__footer-link" to="/terms">{{ t('layout.footer.terms') }}</RouterLink>
      </footer>
    </main>
  </div>
</template>

<script setup lang="ts">
import { Languages } from 'lucide-vue-next';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { setAppLocale, type AppLocale } from '@/i18n';
import { useAuthStore } from '@/stores/auth';

interface NavItem {
  label: string;
  to: string;
}

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();

const menuOpen = ref(false);
const localePanelOpen = ref(false);
const localePickerRef = ref<HTMLElement | null>(null);

const isHome = computed(() => route.name === 'home');
const currentLocale = computed(() => locale.value as AppLocale);
const currentLocaleCode = computed(() => (currentLocale.value === 'zh-CN' ? '中' : 'EN'));
const loginLink = computed(() => ({
  path: '/login',
  query: {
    redirect: route.fullPath,
  },
}));
const localeOptions = computed(() => [
  { value: 'zh-CN' as AppLocale, label: t('locale.zhCN') },
  { value: 'en-US' as AppLocale, label: t('locale.enUS') },
]);

const navItems = computed<NavItem[]>(() => {
  const items: NavItem[] = [
    { label: t('layout.nav.home'), to: '/' },
    { label: t('layout.nav.pricing'), to: '/pricing' },
  ];

  if (authStore.isAuthenticated) {
    items.push({ label: t('layout.nav.history'), to: '/history' });
    items.push({ label: t('layout.nav.profile'), to: '/profile' });
  }

  return items;
});

watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false;
    localePanelOpen.value = false;
  },
);

function isRouteActive(path: string) {
  if (path === '/') {
    return route.path === '/';
  }

  return route.path.startsWith(path);
}

function changeLocale(nextLocale: AppLocale) {
  setAppLocale(nextLocale);
  localePanelOpen.value = false;
}

function toggleLocalePanel() {
  localePanelOpen.value = !localePanelOpen.value;
}

function handleDocumentClick(event: MouseEvent) {
  const target = event.target as Node | null;
  if (!localePickerRef.value || !target) {
    return;
  }

  if (!localePickerRef.value.contains(target)) {
    localePanelOpen.value = false;
  }
}

async function handleLogout() {
  menuOpen.value = false;
  await authStore.logout();
  await router.push('/');
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
});

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick);
});
</script>

<style scoped>
.shell {
  position: relative;
  min-height: 100vh;
  overflow-x: clip;
}

.shell__ambient {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.shell__orb {
  position: absolute;
  border-radius: 999px;
  filter: blur(72px);
  opacity: 0.38;
}

.shell__orb--left {
  top: 4rem;
  left: -8rem;
  width: 22rem;
  height: 22rem;
  background: rgba(122, 226, 255, 0.22);
}

.shell__orb--right {
  right: -10rem;
  bottom: 7rem;
  width: 26rem;
  height: 26rem;
  background: rgba(255, 191, 105, 0.18);
}

.shell__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 72px 72px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.95), transparent 88%);
  opacity: 0.12;
}

.shell__header {
  position: fixed;
  top: 0;
  z-index: 30;
  width: 100%;
  border-bottom: 1px solid rgba(140, 167, 255, 0.1);
  background: rgba(4, 7, 14, 0.62);
  backdrop-filter: blur(12px);
}

.shell__header--home {
  border-bottom-color: rgba(140, 167, 255, 0.08);
  background: rgba(4, 7, 14, 0.48);
}

.shell__header-inner {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  min-height: 5rem;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.9rem;
  min-width: 0;
}

.brand__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.95rem;
  background:
    linear-gradient(135deg, rgba(122, 226, 255, 0.28), rgba(255, 191, 105, 0.28)),
    rgba(255, 255, 255, 0.04);
  color: #f9fcff;
  font-family: var(--font-display);
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.brand__text {
  display: grid;
  gap: 0.18rem;
}

.brand__text strong {
  font-family: var(--font-display);
  font-size: 0.98rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.brand__text small {
  color: rgba(214, 223, 244, 0.7);
  font-size: 0.76rem;
}

.nav {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-left: auto;
}

.nav__link {
  border-radius: 999px;
  padding: 0.72rem 1rem;
  color: rgba(238, 243, 255, 0.76);
  font-size: 0.95rem;
  transition:
    color 180ms ease,
    background-color 180ms ease;
}

.nav__link:hover,
.nav__link.is-active {
  background: rgba(255, 255, 255, 0.05);
  color: #ffffff;
}

.actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-left: 1rem;
}

.locale-picker {
  position: relative;
}

.locale-picker__trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border: 1px solid rgba(122, 226, 255, 0.42);
  border-radius: 999px;
  background: linear-gradient(
      135deg,
      rgba(122, 226, 255, 0.22),
      rgba(255, 191, 105, 0.22)
    ),
    rgba(255, 255, 255, 0.04);
  padding: 0.48rem 0.78rem;
  box-shadow: 0 0 0 1px rgba(122, 226, 255, 0.2), 0 10px 22px rgba(3, 6, 12, 0.34);
}

.locale-picker__icon {
  color: #f1fbff;
}

.locale-picker__label {
  color: rgba(237, 246, 255, 0.95);
  font-size: 0.76rem;
  letter-spacing: 0.02em;
}

.locale-picker__code {
  color: #f7fcff;
  font-size: 0.78rem;
  line-height: 1;
  font-weight: 600;
}

.locale-picker__panel {
  position: absolute;
  top: calc(100% + 0.55rem);
  right: 0;
  z-index: 35;
  display: grid;
  gap: 0.35rem;
  min-width: 8.4rem;
  border: 1px solid rgba(140, 167, 255, 0.22);
  border-radius: 0.9rem;
  background: rgba(4, 7, 14, 0.95);
  box-shadow: 0 18px 40px rgba(3, 6, 12, 0.45);
  padding: 0.4rem;
}

.locale-picker__option {
  border-radius: 0.66rem;
  padding: 0.48rem 0.62rem;
  color: rgba(214, 223, 244, 0.88);
  font-size: 0.8rem;
  text-align: left;
  transition: background-color 160ms ease;
}

.locale-picker__option:hover,
.locale-picker__option.is-active {
  background: rgba(122, 226, 255, 0.26);
  color: #f7fcff;
}

.actions__user {
  max-width: 14rem;
  overflow: hidden;
  border-radius: 999px;
  border: 1px solid rgba(140, 167, 255, 0.18);
  background: rgba(255, 255, 255, 0.03);
  padding: 0.7rem 1rem;
  color: rgba(214, 223, 244, 0.84);
  font-size: 0.86rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-button {
  display: none;
  border: 1px solid rgba(140, 167, 255, 0.24);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.03);
  padding: 0.72rem 1rem;
  color: #eef3ff;
}

.drawer {
  display: none;
}

.shell__main {
  position: relative;
  z-index: 1;
  padding-top: 5rem;
}

.shell__main--home {
  padding-top: 0;
}

.shell__footer {
  display: flex;
  justify-content: center;
  gap: 1rem;
  padding-top: 2rem;
  padding-bottom: 2rem;
}

.shell__footer-link {
  border-radius: 999px;
  border: 1px solid rgba(140, 167, 255, 0.2);
  padding: 0.4rem 0.85rem;
  color: rgba(214, 223, 244, 0.84);
  font-size: 0.78rem;
  transition: border-color 180ms ease;
}

.shell__footer-link:hover {
  border-color: rgba(214, 223, 244, 0.55);
}

@media (max-width: 1023px) {
  .nav,
  .actions > :not(.menu-button):not(.locale-picker) {
    display: none;
  }

  .menu-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .drawer {
    display: grid;
    gap: 0.75rem;
    padding-bottom: 1rem;
  }

  .drawer__link {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-radius: 1rem;
    border: 1px solid rgba(140, 167, 255, 0.14);
    background: rgba(255, 255, 255, 0.03);
    padding: 0.95rem 1rem;
    color: #eef3ff;
  }

  .drawer__locale {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.6rem;
  }

  .drawer__locale-button {
    border-radius: 999px;
    border: 1px solid rgba(140, 167, 255, 0.2);
    background: rgba(255, 255, 255, 0.03);
    padding: 0.65rem 0.8rem;
    color: rgba(214, 223, 244, 0.9);
    font-size: 0.8rem;
  }

  .drawer__locale-button.is-active {
    border-color: rgba(122, 226, 255, 0.5);
    background: rgba(122, 226, 255, 0.2);
    color: #f7fcff;
  }

  .brand__text small {
    display: none;
  }
}

@media (max-width: 767px) {
  .shell__orb--right {
    display: none;
  }

  .shell__header {
    backdrop-filter: blur(8px);
  }

  .shell__header-inner {
    min-height: 4.4rem;
    gap: 1rem;
  }

  .brand__mark {
    width: 2.4rem;
    height: 2.4rem;
    border-radius: 0.82rem;
  }

  .brand__text strong {
    font-size: 0.9rem;
  }
}
</style>
