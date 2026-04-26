import type { FastifyInstance } from 'fastify';

import {
  accountDeletionRequestCancelController,
  accountDeletionRequestCreateController,
  accountDeletionRequestGetController,
} from '../controllers/account.controller.js';
import { authenticate } from '../middlewares/authenticate.js';

export function registerAccountRoutes(server: FastifyInstance) {
  server.post(
    '/api/account/deletion-request',
    {
      preHandler: authenticate,
    },
    accountDeletionRequestCreateController,
  );

  server.get(
    '/api/account/deletion-request',
    {
      preHandler: authenticate,
    },
    accountDeletionRequestGetController,
  );

  server.delete(
    '/api/account/deletion-request',
    {
      preHandler: authenticate,
    },
    accountDeletionRequestCancelController,
  );
}
