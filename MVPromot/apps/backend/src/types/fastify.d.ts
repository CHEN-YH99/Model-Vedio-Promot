import type { FastifyReply, FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    auth?: {
      userId: string;
      sessionId: string;
      jti: string;
      exp: number;
    };
  }
}

export type FastifyHandler = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
