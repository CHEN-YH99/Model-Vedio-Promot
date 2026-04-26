import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5432/video_prompt';
process.env.REDIS_URL ??= 'redis://localhost:6379';

const { parseVideoLinkMeta } = await import('../dist/services/upload-url.service.js');

function createBilibiliViewPayload() {
  return {
    code: 0,
    message: 'OK',
    data: {
      title: '10秒的视频',
      duration: 10,
      cid: 36280535441,
      pages: [{ cid: 36280535441, duration: 10 }],
    },
  };
}

test('parseVideoLinkMeta 保留 Bilibili BV 号主体大小写，仅规范前缀', async () => {
  const originalFetch = globalThis.fetch;
  const bvid = 'BV1PpfbBTEaQ';
  const calledUrls = [];

  globalThis.fetch = async (input) => {
    const url = typeof input === 'string' ? input : input.url;
    calledUrls.push(url);

    if (url.startsWith('https://api.bilibili.com/x/web-interface/view?bvid=')) {
      const requestUrl = new URL(url);
      assert.equal(requestUrl.searchParams.get('bvid'), bvid);

      return new Response(JSON.stringify(createBilibiliViewPayload()), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      });
    }

    throw new Error(`unexpected fetch url: ${url}`);
  };

  try {
    const result = await parseVideoLinkMeta(`https://www.bilibili.com/video/${bvid}/`);

    assert.equal(result.platform, 'bilibili');
    assert.equal(result.title, '10秒的视频');
    assert.ok(calledUrls.some((url) => url.includes(`bvid=${bvid}`)));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('parseVideoLinkMeta 支持 query 参数 bvid，前缀大小写自动规范', async () => {
  const originalFetch = globalThis.fetch;
  const sourceBvid = 'bv1PpfbBTEaQ';
  const expectedBvid = 'BV1PpfbBTEaQ';

  globalThis.fetch = async (input) => {
    const url = typeof input === 'string' ? input : input.url;

    if (url.startsWith('https://api.bilibili.com/x/web-interface/view?bvid=')) {
      const requestUrl = new URL(url);
      assert.equal(requestUrl.searchParams.get('bvid'), expectedBvid);

      return new Response(JSON.stringify(createBilibiliViewPayload()), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      });
    }

    throw new Error(`unexpected fetch url: ${url}`);
  };

  try {
    const result = await parseVideoLinkMeta(
      `https://www.bilibili.com/video/not-match-path/?bvid=${sourceBvid}`,
    );

    assert.equal(result.platform, 'bilibili');
    assert.equal(result.duration, 10);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
