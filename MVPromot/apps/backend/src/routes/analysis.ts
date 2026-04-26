import type { FastifyInstance } from 'fastify';

import {
  analysisDeleteController,
  analysisHistoryController,
  analysisQuotaController,
  analysisExportController,
  analysisFramePromptRegenerateController,
  analysisFramePromptUpdateController,
  analysisResultController,
  analysisShareCreateController,
  analysisStatusController,
  startAnalysisController,
} from '../controllers/analysis.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { enforceAnalysisQuota } from '../middlewares/quota.middleware.js';

export function registerAnalysisRoutes(server: FastifyInstance) {
  server.post(
    '/api/analysis/start',
    { preHandler: [authenticate, enforceAnalysisQuota] },
    startAnalysisController,
  );
  server.get('/api/analysis/quota', { preHandler: authenticate }, analysisQuotaController);
  server.get('/api/analysis/history', { preHandler: authenticate }, analysisHistoryController);
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
  server.put(
    '/api/analysis/:analysisId/frames/:frameId/prompt',
    { preHandler: authenticate },
    analysisFramePromptUpdateController,
  );
  server.post(
    '/api/analysis/:analysisId/frames/:frameId/regenerate',
    { preHandler: authenticate },
    analysisFramePromptRegenerateController,
  );
  server.get(
    '/api/analysis/:analysisId/export',
    { preHandler: authenticate },
    analysisExportController,
  );
  server.post(
    '/api/analysis/:analysisId/share',
    { preHandler: authenticate },
    analysisShareCreateController,
  );
  server.delete(
    '/api/analysis/:analysisId',
    { preHandler: authenticate },
    analysisDeleteController,
  );
}
