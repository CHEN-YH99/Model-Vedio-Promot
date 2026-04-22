import { createRouter, createWebHistory } from 'vue-router';

import AnalyzePage from '@/pages/AnalyzePage.vue';
import AnalysisProgressPage from '@/pages/AnalysisProgressPage.vue';
import HistoryPage from '@/pages/HistoryPage.vue';
import HomePage from '@/pages/HomePage.vue';
import LoginPage from '@/pages/LoginPage.vue';
import PricingPage from '@/pages/PricingPage.vue';
import ProfilePage from '@/pages/ProfilePage.vue';
import RegisterPage from '@/pages/RegisterPage.vue';
import ResultPage from '@/pages/ResultPage.vue';
import SharePage from '@/pages/SharePage.vue';
import { useAuthStore } from '@/stores/auth';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage,
    },
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
      meta: {
        guestOnly: true,
      },
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterPage,
      meta: {
        guestOnly: true,
      },
    },
    {
      path: '/analyze/:fileId',
      name: 'analyze',
      component: AnalyzePage,
      meta: {
        requiresAuth: true,
      },
    },
    {
      path: '/analysis/progress/:analysisId',
      name: 'analysis-progress',
      component: AnalysisProgressPage,
      meta: {
        requiresAuth: true,
      },
    },
    {
      path: '/result/:analysisId',
      name: 'result',
      component: ResultPage,
      meta: {
        requiresAuth: true,
      },
    },
    {
      path: '/pricing',
      name: 'pricing',
      component: PricingPage,
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfilePage,
      meta: {
        requiresAuth: true,
      },
    },
    {
      path: '/history',
      name: 'history',
      component: HistoryPage,
      meta: {
        requiresAuth: true,
      },
    },
    {
      path: '/share/:token',
      name: 'share',
      component: SharePage,
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
