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
            <small>Story-driven prompt workspace</small>
          </span>
        </RouterLink>

        <nav class="nav" aria-label="Primary">
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
          <span v-if="authStore.isAuthenticated" class="actions__user">{{ authStore.user?.email }}</span>

          <template v-if="authStore.isAuthenticated">
            <button type="button" class="vtp-button vtp-button--ghost" @click="handleLogout">Logout</button>
          </template>
          <template v-else>
            <RouterLink class="vtp-button vtp-button--ghost" :to="loginLink">Login</RouterLink>
            <RouterLink class="vtp-button" to="/register">Register</RouterLink>
          </template>

          <button type="button" class="menu-button" :aria-expanded="menuOpen ? 'true' : 'false'" @click="menuOpen = !menuOpen">
            Menu
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
          <button type="button" class="drawer__link" @click="handleLogout">Logout</button>
        </template>
        <template v-else>
          <RouterLink class="drawer__link" :to="loginLink" @click="menuOpen = false">Login</RouterLink>
          <RouterLink class="drawer__link" to="/register" @click="menuOpen = false">Register</RouterLink>
        </template>
      </div>
    </header>

    <main class="shell__main" :class="{ 'shell__main--home': isHome }">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAuthStore } from '@/stores/auth';

interface NavItem {
  label: string;
  to: string;
}

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const menuOpen = ref(false);

const isHome = computed(() => route.name === 'home');
const loginLink = computed(() => ({
  path: '/login',
  query: {
    redirect: route.fullPath,
  },
}));

const navItems = computed<NavItem[]>(() => {
  const items: NavItem[] = [
    { label: 'Home', to: '/' },
    { label: 'Pricing', to: '/pricing' },
  ];

  if (authStore.isAuthenticated) {
    items.push({ label: 'History', to: '/history' });
    items.push({ label: 'Profile', to: '/profile' });
  }

  return items;
});

watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false;
  },
);

function isRouteActive(path: string) {
  if (path === '/') {
    return route.path === '/';
  }

  return route.path.startsWith(path);
}

async function handleLogout() {
  menuOpen.value = false;
  await authStore.logout();
  await router.push('/');
}
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

@media (max-width: 1023px) {
  .nav,
  .actions > :not(.menu-button) {
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
