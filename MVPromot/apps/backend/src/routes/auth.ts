import type { FastifyInstance } from 'fastify';

import {
  googleOAuthCallbackController,
  googleOAuthStartController,
  loginController,
  logoutController,
  meController,
  oauthExchangeController,
  refreshController,
  registerController,
  wechatOAuthCallbackController,
  wechatOAuthStartController,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/authenticate.js';

export function registerAuthRoutes(server: FastifyInstance) {
  server.post(
    '/api/auth/register',
    {
      config: {
        rateLimit: {
          max: 3,
          timeWindow: '1 minute',
        },
      },
    },
    registerController,
  );

  server.post(
    '/api/auth/login',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
        },
      },
    },
    loginController,
  );

  server.post('/api/auth/refresh', refreshController);
  server.post('/api/auth/logout', { preHandler: authenticate }, logoutController);
  server.get('/api/auth/me', { preHandler: authenticate }, meController);
  server.get('/api/auth/oauth/google/start', googleOAuthStartController);
  server.get('/api/auth/oauth/google/callback', googleOAuthCallbackController);
  server.get('/api/auth/oauth/wechat/start', wechatOAuthStartController);
  server.get('/api/auth/oauth/wechat/callback', wechatOAuthCallbackController);
  server.post('/api/auth/oauth/exchange', oauthExchangeController);
}
