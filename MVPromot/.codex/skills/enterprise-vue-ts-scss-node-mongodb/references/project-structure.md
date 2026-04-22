# 项目结构基线（Vue + Node + MongoDB）

## 1. 前端目录（Vue + TypeScript + SCSS）

```text
web/
  src/
    app/
      router/
      providers/
      layouts/
    features/
      <feature-name>/
        pages/
        components/
        composables/
        services/
        store/
        types/
        constants/
        __tests__/
    shared/
      components/
      composables/
      directives/
      utils/
      constants/
      types/
      styles/
    assets/
```

规则：

- 在 `features` 下按业务域组织，不在 `components` 里堆全局业务组件。
- `shared` 只放无业务耦合能力，不得反向依赖 `features`。
- 页面级路由组件只做组装，不承载复杂业务逻辑。

## 2. 后端目录（Node.js + TypeScript）

```text
server/
  src/
    bootstrap/
    config/
    modules/
      <domain-name>/
        controllers/
        services/
        repositories/
        models/
        dto/
        validators/
        routes/
        mappers/
        __tests__/
    middlewares/
    jobs/
    libs/
    utils/
    app.ts
```

规则：

- `controller` 负责协议层（req/res），不写业务判断。
- `service` 负责业务流程，不直接关心 HTTP 细节。
- `repository` 负责数据库访问细节，封装查询与索引依赖。
- 跨模块调用通过 `service` 接口，不直接引用对方 `repository`。

## 3. 数据层约束（MongoDB）

- 每个业务域在 `models` 下定义 schema/model，并维护索引声明。
- 写入路径必须有数据校验（DTO + validator）。
- 读取路径默认做字段投影，避免“全字段捞取”。
- 聚合查询集中在 `repositories`，不要散落在 controllers/services。

## 4. 依赖方向（强制）

允许：

- `pages -> features/*`
- `features/* -> shared/*`
- `controllers -> services -> repositories -> models`

禁止：

- `shared -> features`
- `controllers -> repositories`
- `features/a` 直接引用 `features/b` 的内部私有文件

## 5. 模块边界建议

- 为每个业务域提供单一入口（如 `index.ts` barrel 导出）。
- 默认只导出必要接口，禁止把内部实现全量暴露。
- 新模块必须带最小单测（核心 service 或关键 composable）。
