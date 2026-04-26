import type { FastifyInstance } from 'fastify';

import {
  analysisExportController,
  analysisFramePromptRegenerateController,
  analysisFramePromptUpdateController,
  analysisResultController,
  analysisShareCreateController,
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
}
