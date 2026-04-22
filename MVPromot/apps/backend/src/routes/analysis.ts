import type { FastifyInstance } from 'fastify';

import {
  analysisResultController,
  analysisStatusController,
  startAnalysisController,
} from '../controllers/analysis.controller.js';
import { authenticate } from '../middlewares/authenticate.js';

export function registerAnalysisRoutes(server: FastifyInstance) {
  server.post('/api/analysis/start', { preHandler: authenticate }, startAnalysisController);
  server.get(
    '/api/analysis/:analysisId/status',
    { preHandler: authenticate },
    analysisStatusController,
  );
  server.get(
    '/api/analysis/:analysisId/result',
    { preHandler: authenticate },
    analysisResultController,
  );
}
