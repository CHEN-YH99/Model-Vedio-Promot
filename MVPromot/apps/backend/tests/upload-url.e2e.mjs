import assert from 'node:assert/strict';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000';
const PASSWORD = process.env.E2E_PASSWORD ?? 'Passw0rd2026';
const EMAIL =
  process.env.E2E_EMAIL ?? `upload-url-e2e-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;

const YOUTUBE_SUCCESS_URL = process.env.E2E_YOUTUBE_SUCCESS_URL?.trim() ?? '';
const BILIBILI_SUCCESS_URL = process.env.E2E_BILIBILI_SUCCESS_URL?.trim() ?? '';
const YOUTUBE_FAIL_URL = process.env.E2E_YOUTUBE_FAIL_URL?.trim() ?? 'https://www.youtube.com/watch';
const BILIBILI_FAIL_URL =
  process.env.E2E_BILIBILI_FAIL_URL?.trim() ?? 'https://www.bilibili.com/video/not-a-bv-id';

const TIMEOUT_MS = Number(process.env.E2E_DOWNLOAD_TIMEOUT_MS ?? 120000);
const POLL_INTERVAL_MS = Number(process.env.E2E_DOWNLOAD_POLL_INTERVAL_MS ?? 1500);

const summary = [];

function now() {
  return new Date().toISOString();
}

function log(message) {
  console.log(`[${now()}] ${message}`);
}

function ensureErrorPayload(payload, expectedCode) {
  assert.equal(typeof payload?.message, 'string', '失败响应缺少 message');
  assert.ok(payload.message.trim().length > 0, '失败响应 message 不能为空');
  if (expectedCode) {
    assert.equal(payload.code, expectedCode, `预期错误码 ${expectedCode}，实际 ${payload.code}`);
  }
}

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`响应不是合法 JSON，HTTP ${response.status}: ${text.slice(0, 200)}`);
  }
}

async function request(input) {
  const response = await fetch(`${BASE_URL}${input.path}`, {
    method: input.method,
    headers: {
      'Content-Type': 'application/json',
      ...(input.token ? { Authorization: `Bearer ${input.token}` } : {}),
    },
    body: input.body ? JSON.stringify(input.body) : undefined,
  });

  const payload = await parseJsonResponse(response);

  return {
    status: response.status,
    payload,
  };
}

async function registerUser() {
  const register = await request({
    method: 'POST',
    path: '/api/auth/register',
    body: {
      email: EMAIL,
      password: PASSWORD,
      name: 'Upload URL E2E',
    },
  });

  if (register.status === 201) {
    assert.equal(typeof register.payload?.accessToken, 'string');
    return register.payload.accessToken;
  }

  if (register.status !== 409) {
    throw new Error(`注册失败，HTTP ${register.status}，payload: ${JSON.stringify(register.payload)}`);
  }

  const login = await request({
    method: 'POST',
    path: '/api/auth/login',
    body: {
      email: EMAIL,
      password: PASSWORD,
    },
  });

  assert.equal(login.status, 200, `登录失败，HTTP ${login.status}`);
  assert.equal(typeof login.payload?.accessToken, 'string');
  return login.payload.accessToken;
}

async function parseUrl(token, url, expectedStatus = 200) {
  const response = await request({
    method: 'POST',
    path: '/api/upload/url',
    token,
    body: {
      url,
      agreedToTerms: true,
    },
  });

  assert.equal(response.status, expectedStatus, `解析接口状态码异常（${url}）`);
  return response.payload;
}

async function startDownload(token, url, expectedStatus = 202) {
  const response = await request({
    method: 'POST',
    path: '/api/upload/url/download',
    token,
    body: {
      url,
      agreedToTerms: true,
    },
  });

  assert.equal(response.status, expectedStatus, `下载任务创建状态码异常（${url}）`);
  return response.payload;
}

async function getDownloadStatus(token, taskId) {
  const response = await request({
    method: 'GET',
    path: `/api/upload/url/download/${taskId}/status`,
    token,
  });

  assert.equal(response.status, 200, `下载状态查询失败，HTTP ${response.status}`);
  return response.payload;
}

async function waitForTaskDone(token, taskId) {
  const deadline = Date.now() + TIMEOUT_MS;
  let latest = null;

  while (Date.now() <= deadline) {
    latest = await getDownloadStatus(token, taskId);

    if (latest.status === 'DONE') {
      return latest;
    }

    if (latest.status === 'FAILED') {
      throw new Error(
        `任务失败（taskId=${taskId}）：${latest.errorMessage || '未知错误'}，payload=${JSON.stringify(latest)}`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(`任务超时未完成（taskId=${taskId}），最后状态：${JSON.stringify(latest)}`);
}

async function runScenario(name, runner) {
  const startedAt = Date.now();
  try {
    await runner();
    const duration = Date.now() - startedAt;
    summary.push({ name, status: 'PASS', duration });
    log(`PASS - ${name} (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - startedAt;
    summary.push({
      name,
      status: 'FAIL',
      duration,
      error: error instanceof Error ? error.message : String(error),
    });
    log(`FAIL - ${name} (${duration}ms)`);
  }
}

async function main() {
  log(`2-1 联调脚本启动，BASE_URL=${BASE_URL}`);
  const accessToken = await registerUser();
  log(`认证完成，账号=${EMAIL}`);

  await runScenario('YouTube 失败场景（解析失败要有明确报错）', async () => {
    const payload = await parseUrl(accessToken, YOUTUBE_FAIL_URL, 400);
    ensureErrorPayload(payload, 'YOUTUBE_META_FAILED');
  });

  await runScenario('Bilibili 失败场景（解析失败要有明确报错）', async () => {
    const payload = await parseUrl(accessToken, BILIBILI_FAIL_URL, 400);
    ensureErrorPayload(payload, 'BILIBILI_BVID_NOT_FOUND');
  });

  await runScenario('YouTube 失败场景（下载失败要有明确报错）', async () => {
    const payload = await startDownload(accessToken, YOUTUBE_FAIL_URL, 400);
    ensureErrorPayload(payload, 'YOUTUBE_META_FAILED');
  });

  await runScenario('Bilibili 失败场景（下载失败要有明确报错）', async () => {
    const payload = await startDownload(accessToken, BILIBILI_FAIL_URL, 400);
    ensureErrorPayload(payload, 'BILIBILI_BVID_NOT_FOUND');
  });

  if (YOUTUBE_SUCCESS_URL) {
    await runScenario('YouTube 成功场景（解析 + 异步下载）', async () => {
      const parsePayload = await parseUrl(accessToken, YOUTUBE_SUCCESS_URL, 200);
      assert.equal(parsePayload.platform, 'youtube');
      assert.equal(parsePayload.source, 'live');
      assert.ok(parsePayload.title?.trim().length > 0, '标题为空');
      assert.ok(Number(parsePayload.duration) > 0, '时长无效');

      const taskPayload = await startDownload(accessToken, YOUTUBE_SUCCESS_URL, 202);
      assert.ok(taskPayload.taskId, '缺少 taskId');

      const done = await waitForTaskDone(accessToken, taskPayload.taskId);
      assert.equal(done.status, 'DONE');
      assert.equal(done.result?.platform, 'youtube');
      assert.ok(done.result?.fileId, '缺少 fileId');
    });
  } else {
    log('SKIP - YouTube 成功场景（未提供 E2E_YOUTUBE_SUCCESS_URL）');
  }

  if (BILIBILI_SUCCESS_URL) {
    await runScenario('Bilibili 成功场景（解析 + 异步下载）', async () => {
      const parsePayload = await parseUrl(accessToken, BILIBILI_SUCCESS_URL, 200);
      assert.equal(parsePayload.platform, 'bilibili');
      assert.equal(parsePayload.source, 'live');
      assert.ok(parsePayload.title?.trim().length > 0, '标题为空');
      assert.ok(Number(parsePayload.duration) > 0, '时长无效');

      const taskPayload = await startDownload(accessToken, BILIBILI_SUCCESS_URL, 202);
      assert.ok(taskPayload.taskId, '缺少 taskId');

      const done = await waitForTaskDone(accessToken, taskPayload.taskId);
      assert.equal(done.status, 'DONE');
      assert.equal(done.result?.platform, 'bilibili');
      assert.ok(done.result?.fileId, '缺少 fileId');
    });
  } else {
    log('SKIP - Bilibili 成功场景（未提供 E2E_BILIBILI_SUCCESS_URL）');
  }

  console.log('\n===== 2-1 联调结果 =====');
  for (const item of summary) {
    const suffix = item.error ? ` | ${item.error}` : '';
    console.log(`${item.status} | ${item.name} | ${item.duration}ms${suffix}`);
  }

  const hasFailure = summary.some((item) => item.status === 'FAIL');
  if (hasFailure) {
    throw new Error('存在失败场景，请查看上方汇总日志');
  }
}

main().catch((error) => {
  console.error('\n2-1 联调脚本执行失败：');
  console.error(error);
  process.exit(1);
});
