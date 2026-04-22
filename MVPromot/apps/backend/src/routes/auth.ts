import type { FastifyInstance } from 'fastify';

import {
  loginController,
  logoutController,
  meController,
  refreshController,
  registerController,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/authenticate.js';

export function registerAuthRoutes(server: FastifyInstance) {
  server.post('/api/auth/register', registerController);

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
}
