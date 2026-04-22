import { createReadStream } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import http from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { Readable } from 'node:stream';

const distRoot = resolve('./dist');
const indexPath = join(distRoot, 'index.html');
const backendOrigin = process.env.BACKEND_ORIGIN ?? 'http://backend:3000';
const port = Number(process.env.PORT ?? 80);

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
};

function setCacheHeaders(response, pathname) {
  if (pathname.startsWith('/assets/')) {
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return;
  }

  if (pathname.startsWith('/images/')) {
    response.setHeader('Cache-Control', 'public, max-age=2592000');
  }
}

function setContentType(response, pathname) {
  const contentType = mimeTypes[extname(pathname)] ?? 'application/octet-stream';
  response.setHeader('Content-Type', contentType);
}

async function serveFile(response, filePath, pathname) {
  const fileStat = await stat(filePath);
  response.statusCode = 200;
  response.setHeader('Content-Length', String(fileStat.size));
  setCacheHeaders(response, pathname);
  setContentType(response, pathname);
  createReadStream(filePath).pipe(response);
}

function sanitizePath(pathname) {
  const nextPath = normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, '');
  return join(distRoot, nextPath);
}

async function serveStatic(response, pathname) {
  const targetPath = sanitizePath(pathname);

  try {
    await access(targetPath);
    await serveFile(response, targetPath, pathname);
  } catch {
    await serveFile(response, indexPath, '/index.html');
  }
}

async function proxyRequest(request, response) {
  const targetUrl = new URL(request.url, backendOrigin);
  const upstream = await fetch(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request,
    duplex: request.method === 'GET' || request.method === 'HEAD' ? undefined : 'half',
  });

  response.statusCode = upstream.status;

  upstream.headers.forEach((value, key) => {
    response.setHeader(key, value);
  });

  if (!upstream.body) {
    response.end();
    return;
  }

  Readable.fromWeb(upstream.body).pipe(response);
}

const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url ?? '/', 'http://frontend.local');
    const pathname = requestUrl.pathname;

    if (pathname.startsWith('/api/') || pathname.startsWith('/uploads/')) {
      await proxyRequest(request, response);
      return;
    }

    await serveStatic(response, pathname === '/' ? '/index.html' : pathname);
  } catch (error) {
    response.statusCode = 500;
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.end(`Frontend server error: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`frontend server listening on ${port}`);
});
