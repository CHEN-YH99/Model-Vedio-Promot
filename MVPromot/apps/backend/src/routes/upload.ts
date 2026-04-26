import type { FastifyInstance } from 'fastify';

import {
  uploadController,
  uploadMetaController,
  uploadUrlDownloadController,
  uploadUrlDownloadStatusController,
  uploadUrlParseController,
} from '../controllers/upload.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { requireCopyrightAgreement } from '../middlewares/copyright-agreement.js';

export function registerUploadRoutes(server: FastifyInstance) {
  server.post('/api/upload', { preHandler: authenticate }, uploadController);
  server.get('/api/upload/:fileId/meta', { preHandler: authenticate }, uploadMetaController);
  server.post(
    '/api/upload/url',
    {
      preHandler: [authenticate, requireCopyrightAgreement],
    },
    uploadUrlParseController,
  );
  server.post(
    '/api/upload/url/download',
    {
      preHandler: [authenticate, requireCopyrightAgreement],
    },
    uploadUrlDownloadController,
  );
  server.get(
    '/api/upload/url/download/:taskId/status',
    { preHandler: authenticate },
    uploadUrlDownloadStatusController,
  );
}
