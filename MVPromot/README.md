# 视频转提示词网站

面向 AI 视频创作者的在线提示词生成工具。上传视频或粘贴链接，自动分析画面内容、运镜、风格、节奏，输出适配主流视频生成模型（Sora / Runway / 可灵 / Pika / 万象 / 海螺）的中英提示词。

- 需求文档：[需求文档.md](需求文档.md)
- 开发闯关：[开发闯关.md](开发闯关.md)

---

## 技术栈

| 层级 | 选型 |
|------|------|
| 前端 | Vue 3 + TypeScript + Vite + Pinia + Vue Router + Tailwind CSS v4 + shadcn-vue |
| 后端 | Node.js 22 + TypeScript（严格模式）+ Fastify 5 |
| 数据库 | PostgreSQL 16 + Prisma ORM |
| 缓存/队列 | Redis 7 + BullMQ |
| 视频处理 | FFmpeg / FFprobe（子进程） |
| AI 分析 | 智谱 GLM-4.1V-Thinking-FlashX（Chat Completions，含 mock 降级） |
| 部署 | Docker + Docker Compose |

---

## 快速启动

### 一键启动（推荐）

```bash
cp .env.example apps/backend/.env
docker compose up
```

- 前端：http://localhost:5173
- 后端：http://localhost:3000
- 健康检查：http://localhost:3000/health → `{ "status": "ok" }`

### 本机开发（分别启动）

```bash
# 1. 启动依赖
docker compose up postgres redis -d

# 2. 后端
cd apps/backend
npm install
npm run prisma:generate && npm run prisma:migrate
npm run dev

# 3. 前端（另开终端）
cd apps/frontend
npm install
npm run dev
```

---

## 目录结构

```
视频转提示词项目/
├── apps/
│   ├── backend/              # Fastify + Prisma + BullMQ
│   │   ├── prisma/schema.prisma
│   │   ├── src/
│   │   │   ├── controllers/  # 路由处理器
│   │   │   ├── services/     # 业务逻辑（auth / upload / analysis / ai）
│   │   │   ├── queues/       # BullMQ 任务队列
│   │   │   ├── middlewares/  # 鉴权、版权声明
│   │   │   ├── plugins/      # prisma / redis 连接
│   │   │   ├── routes/       # API 路由注册
│   │   │   ├── config/env.ts # zod 校验的环境变量
│   │   │   └── types/
│   │   └── tests/            # node:test 单元测试
│   └── frontend/             # Vue 3 + Vite
│       └── src/
│           ├── api/          # axios 封装 + 拦截器
│           ├── components/   # UploadZone 等公共组件
│           ├── composables/
│           ├── layouts/
│           ├── pages/        # 路由页面
│           ├── stores/       # Pinia（auth / upload / app）
│           ├── types/
│           └── utils/
├── .github/workflows/ci.yml  # lint + types + build
├── docker-compose.yml        # postgres + redis + backend + frontend
└── .env.example              # 单一模板，带分环境注释
```

---

## 环境变量

采用**单一模板 + 环境覆盖**策略，不维护多份 `.env` 文件。具体差异见 [.env.example](.env.example) 顶部注释。

优先级：部署平台 secrets > docker-compose `environment:` > `.env` 文件 > 代码默认值。

| 环境 | 取值来源 |
|------|----------|
| development | `apps/backend/.env`（从 `.env.example` 拷贝） |
| test | 测试脚本顶部 `process.env.X ??=` 设置默认值（见 `apps/backend/tests/*.test.mjs`）|
| production | 部署平台 Secrets 注入；敏感字段（JWT_*、OPENAI_API_KEY）不入库、不进镜像 |

---

## 测试

```bash
cd apps/backend
npm test                 # auth + frame-extractor 单元测试
npm run test:coverage    # 带覆盖率报告
```

覆盖率目标：核心业务逻辑 ≥ 80%（闯关 DoD 要求）。

---

## 技术决策

### 为什么用 @fastify/multipart 而不是 Multer

开发闯关文档列的是 Multer，实际实现采用 [@fastify/multipart](https://github.com/fastify/fastify-multipart)。原因：

- **生态对齐**：Multer 是 Express 生态产物，在 Fastify 下需要手写适配层，官方明确推荐 `@fastify/multipart`。
- **能力对等**：流式上传、大小限制、字段解析、多文件等特性完整覆盖 Multer 用例，[server.ts](apps/backend/src/server.ts) 中已配置 `fileSize: 500MB` 与 `files: 1`。
- **实现统一**：上传落盘使用 `stream.pipeline` + 自定义 `Transform` 做字节计数与超限中断（见 [upload.service.ts](apps/backend/src/services/upload.service.ts)），比 Multer 的磁盘存储策略更易与 FFprobe 提取元数据串联。

结论：功能上等价，选型基于框架一致性。

### AI 分析与 mock 降级

[ai-analyzer.service.ts](apps/backend/src/services/ai-analyzer.service.ts) 默认按智谱 `chat/completions` 接口调用 `glm-4.1v-thinking-flashx`，并使用 JSON 模式约束结构化输出；`ANALYSIS_PROVIDER=mock` 时返回确定性的占位分析，用于开发/测试不消耗 API 额度。

### 关键帧采样：场景切换 + 均匀采样合并

[frame-extractor.service.ts](apps/backend/src/services/frame-extractor.service.ts) 同时跑 `ffmpeg select=gt(scene,threshold)` 场景检测与固定间隔采样，再按优先级（首帧/尾帧 > 场景切换 > 均匀填充）合并去重到 `ANALYSIS_MAX_FRAMES` 上限，场景检测失败自动降级到均匀采样。

---

## 开发纪律

- TypeScript 严格模式，禁止 `any`（合理场景需写注释）
- Husky pre-commit：`npm run lint && npm run types`
- CI：`.github/workflows/ci.yml` 跑 lint + types + build
- 每次接口新增或修改，同步更新本 README 与 [开发闯关.md](开发闯关.md) 的 DoD 勾选状态
