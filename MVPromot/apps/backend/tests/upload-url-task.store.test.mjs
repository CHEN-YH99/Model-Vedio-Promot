import assert from 'node:assert/strict';
import { test } from 'node:test';

const { createUploadUrlTaskStore } = await import('../dist/services/upload-url-task.store.js');
const { HttpError } = await import('../dist/utils/http-error.js');

function createContext() {
  const kv = new Map();
  let taskCounter = 0;
  let timestampCounter = 0;

  const store = createUploadUrlTaskStore({
    createTaskId: () => {
      taskCounter += 1;
      return `task_${taskCounter}`;
    },
    getNowIso: () => {
      timestampCounter += 1;
      return new Date(Date.UTC(2026, 0, 1, 0, 0, timestampCounter)).toISOString();
    },
    redisGet: async (key) => kv.get(key) ?? null,
    redisSet: async (key, value) => {
      kv.set(key, value);
      return 'OK';
    },
    ttlSeconds: 3600,
  });

  return {
    store,
  };
}

test('createTask + getTaskForUser 返回待下载任务状态', async () => {
  const { store } = createContext();

  const task = await store.createTask('user_1');
  assert.equal(task.taskId, 'task_1');
  assert.equal(task.status, 'PENDING');
  assert.equal(task.progress, 5);
  assert.equal(task.errorMessage, null);
  assert.equal(task.result, null);

  const fetched = await store.getTaskForUser({
    taskId: task.taskId,
    userId: 'user_1',
  });
  assert.equal(fetched.taskId, task.taskId);
  assert.equal(fetched.status, 'PENDING');
});

test('getTaskForUser 对非本人任务返回 403', async () => {
  const { store } = createContext();
  const task = await store.createTask('owner_1');

  await assert.rejects(
    async () => {
      await store.getTaskForUser({
        taskId: task.taskId,
        userId: 'other_user',
      });
    },
    (error) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 403);
      assert.equal(error.code, 'UPLOAD_URL_TASK_FORBIDDEN');
      return true;
    },
  );
});

test('markTaskDownloading/markTaskSaving 会推进状态与进度', async () => {
  const { store } = createContext();
  const task = await store.createTask('user_1');

  const downloading = await store.markTaskDownloading(task.taskId, 40);
  assert.equal(downloading.status, 'DOWNLOADING');
  assert.equal(downloading.progress, 40);

  const saving = await store.markTaskSaving(task.taskId, 88);
  assert.equal(saving.status, 'DOWNLOADING');
  assert.equal(saving.progress, 88);
});

test('markTaskDone / markTaskFailed 能正确写入终态', async () => {
  const { store } = createContext();
  const task = await store.createTask('user_1');

  const done = await store.markTaskDone(task.taskId, {
    fileId: 'upload_1',
    temporaryPath: '/tmp/upload_1.mp4',
    platform: 'youtube',
    title: 'test-title',
    duration: 61.2,
    source: 'live',
    mode: 'downloaded',
  });
  assert.equal(done.status, 'DONE');
  assert.equal(done.progress, 100);
  assert.equal(done.result?.fileId, 'upload_1');
  assert.equal(done.errorMessage, null);

  const failedTask = await store.createTask('user_2');
  const failed = await store.markTaskFailed(failedTask.taskId, '网络超时');
  assert.equal(failed.status, 'FAILED');
  assert.equal(failed.progress, 100);
  assert.equal(failed.errorMessage, '网络超时');
  assert.equal(failed.result, null);
});
