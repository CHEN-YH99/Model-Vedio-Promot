import type { FastifyInstance } from 'fastify';

export function registerHealthRoutes(server: FastifyInstance) {
  server.get('/health', async () => {
    return {
      status: 'ok',
      service: 'video-to-prompt-backend',
      timestamp: new Date().toISOString(),
    };
  });
}
