import Fastify, { type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';

import { env } from './config/env.js';
import { prisma } from './plugins/prisma.js';
import { registerAccountRoutes } from './routes/account.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerAnalysisRoutes } from './routes/analysis.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerShareRoutes } from './routes/share.js';
import { registerUploadRoutes } from './routes/upload.js';

const LATENCY_WINDOW_LOG_INTERVAL_MS = 60_000;
const SLOW_QUERY_THRESHOLD_MS = 100;
const requestStartedAt = new WeakMap<FastifyRequest, bigint>();
let prismaSlowQueryHookBound = false;

function calculateP95(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
  return Number((sorted[index] ?? 0).toFixed(2));
}

function normalizeHostForHttps(host: string) {
  if (!host) {
    return '';
  }

  if (host.startsWith('[')) {
    const index = host.indexOf(']');
    if (index < 0) {
      return host;
    }

    return host.slice(0, index + 1);
  }

  const segments = host.split(':');
  return segments[0] ?? host;
}

function buildHttpsRedirectUrl(request: FastifyRequest) {
  const hostHeader = request.headers.host ?? request.hostname;
  const normalizedHost = normalizeHostForHttps(hostHeader ?? '');
  const portSegment = env.SECURITY_HTTPS_PORT === 443 ? '' : `:${env.SECURITY_HTTPS_PORT}`;
  const rawUrl = request.raw.url ?? '/';

  return `https://${normalizedHost}${portSegment}${rawUrl}`;
}

function shouldRedirectToHttps(request: FastifyRequest) {
  if (!env.SECURITY_ENABLE_HTTPS_REDIRECT) {
    return false;
  }

  const forwardedProto = request.headers['x-forwarded-proto'];

  if (typeof forwardedProto === 'string') {
    return !forwardedProto.toLowerCase().startsWith('https');
  }

  return request.protocol !== 'https';
}

function bindPrismaSlowQueryMonitor(server: ReturnType<typeof Fastify>) {
  if (prismaSlowQueryHookBound) {
    return;
  }

  prismaSlowQueryHookBound = true;

  prisma.$on('query', (event) => {
    if (event.duration <= SLOW_QUERY_THRESHOLD_MS) {
      return;
    }

    server.log.warn(
      {
        durationMs: event.duration,
        target: event.target,
      },
      '检测到慢查询（>100ms）',
    );
  });
}

export async function buildServer() {
  const server = Fastify({
    trustProxy: true,
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.body.password',
          'req.body.refreshToken',
          'req.body.accessToken',
          'req.body.code',
          'res.headers.set-cookie',
        ],
        remove: true,
      },
    },
  });

  bindPrismaSlowQueryMonitor(server);

  if (env.SECURITY_ENABLE_HTTPS_REDIRECT) {
    server.addHook('onRequest', async (request, reply) => {
      if (!shouldRedirectToHttps(request)) {
        return;
      }

      return reply.redirect(buildHttpsRedirectUrl(request), 308);
    });
  }

  server.addHook('onRequest', async (request) => {
    requestStartedAt.set(request, process.hrtime.bigint());
  });

  const latencyWindow: number[] = [];
  const latencyTimer = setInterval(() => {
    if (latencyWindow.length === 0) {
      return;
    }

    const p95 = calculateP95(latencyWindow);
    const count = latencyWindow.length;

    server.log.info(
      {
        metric: 'http_latency',
        windowMs: LATENCY_WINDOW_LOG_INTERVAL_MS,
        count,
        p95Ms: p95,
      },
      '接口响应时延统计',
    );

    latencyWindow.length = 0;
  }, LATENCY_WINDOW_LOG_INTERVAL_MS);

  latencyTimer.unref();

  server.addHook('onResponse', async (request) => {
    const startedAt = requestStartedAt.get(request);

    if (!startedAt) {
      return;
    }

    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    latencyWindow.push(durationMs);
  });

  server.addHook('onClose', async () => {
    clearInterval(latencyTimer);
  });

  await server.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: false,
  });

  await server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    frameguard: {
      action: 'deny',
    },
    hsts:
      env.NODE_ENV === 'production'
        ? {
            maxAge: 15552000,
            includeSubDomains: true,
            preload: true,
          }
        : false,
  });

  await server.register(rateLimit, {
    global: false,
  });

  await server.register(multipart, {
    limits: {
      files: 1,
      fileSize: 500 * 1024 * 1024,
    },
  });

  await server.register(fastifyStatic, {
    root: env.UPLOAD_DIR,
    prefix: '/uploads/',
    decorateReply: false,
  });

  registerAuthRoutes(server);
  registerAccountRoutes(server);
  registerAnalysisRoutes(server);
  registerShareRoutes(server);
  registerUploadRoutes(server);
  registerHealthRoutes(server);

  return server;
}
