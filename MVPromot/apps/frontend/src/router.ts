import { createRouter, createWebHistory } from 'vue-router';

import { useAuthStore } from '@/stores/auth';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/pages/HomePage.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/LoginPage.vue'),
      meta: {
        guestOnly: true,
      },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/pages/RegisterPage.vue'),
      meta: {
        guestOnly: true,
      },
    },
    {
      path: '/oauth/callback',
      name: 'oauth-callback',
      component: () => import('@/pages/OAuthCallbackPage.vue'),
      meta: {
        guestOnly: true,
      },
    },
    {
      path: '/analyze/:fileId',
      name: 'analyze',
      component: () => import('@/pages/AnalyzePage.vue'),
      meta: {
        requiresAuth: true,
      },
    },
    {
      path: '/analysis/progress/:analysisId',
      name: 'analysis-progress',
      component: () => import('@/pages/AnalysisProgressPage.vue'),
      meta: {
        requiresAuth: true,
      },
    },
    {
      path: '/result/:analysisId',
      name: 'result',
      component: () => import('@/pages/ResultPage.vue'),
      meta: {
        requiresAuth: true,
      },
    },
    {
      path: '/pricing',
      name: 'pricing',
      component: () => import('@/pages/PricingPage.vue'),
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/pages/ProfilePage.vue'),
      meta: {
        requiresAuth: true,
      },
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('@/pages/HistoryPage.vue'),
      meta: {
        requiresAuth: true,
      },
    },
    {
      path: '/share/:token',
      name: 'share',
      component: () => import('@/pages/SharePage.vue'),
    },
    {
      path: '/privacy',
      name: 'privacy',
      component: () => import('@/pages/PrivacyPolicyPage.vue'),
    },
    {
      path: '/terms',
      name: 'terms',
      component: () => import('@/pages/TermsOfServicePage.vue'),
    },
  ],
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();

  authStore.hydrateFromStorage();

  if (authStore.accessToken && !authStore.user) {
    try {
      await authStore.fetchMe();
    } catch {
      authStore.clearAuth();
    }
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return {
      path: '/login',
      query: {
        redirect: to.fullPath,
      },
    };
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return '/';
  }

  return true;
});
