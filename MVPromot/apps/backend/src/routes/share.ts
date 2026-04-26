import type { FastifyInstance } from 'fastify';

import { sharedAnalysisResultController } from '../controllers/share.controller.js';

export function registerShareRoutes(server: FastifyInstance) {
  server.get('/api/share/:token', sharedAnalysisResultController);
}
