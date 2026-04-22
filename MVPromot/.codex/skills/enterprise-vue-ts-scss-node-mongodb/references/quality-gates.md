# 质量门禁与工程规范

## 1. 基础工具链（建议）

前端：

- `eslint` + `@typescript-eslint`
- `prettier`
- `stylelint`（用于 SCSS）
- `vitest` 或 `jest`

后端：

- `eslint`
- `prettier`
- `tsc --noEmit`
- `vitest` 或 `jest`

统一：

- `.editorconfig`
- `husky` + `lint-staged`

## 2. 提交前硬性检查

至少执行：

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

如果是多包仓库，按工作区分别执行等价命令。

## 3. 推荐格式规范

- TypeScript: `strict: true`。
- 禁止未使用变量、隐式 any、重复依赖导入。
- import 排序固定化（分组 + 字母序）。
- 统一使用分号与引号策略（由 Prettier 决定并固定）。
- SCSS 变量、mixin、函数均按层级目录管理。

## 4. 测试覆盖建议

- 关键业务 service 需要单测。
- 关键 API 路径需要集成测试。
- 复杂 composable 需要行为测试。
- 回归 bug 必须补充对应测试。

## 5. PR 评审清单

- 是否遵循目录边界与依赖方向。
- 命名是否符合规范且语义清晰。
- 是否引入了重复逻辑但未抽象。
- 是否补齐必要测试。
- 是否有可观测性改进（日志、错误上下文、指标）。
- 是否更新相关文档或注释（仅在必要时）。

## 6. 明确禁止

- 未经说明直接跳过 lint/typecheck/test/build。
- 为通过检查而关闭关键规则。
- 在 controller 写复杂业务逻辑。
- 在 Vue 页面组件中直接堆积数据访问与转换细节。
- 在 Mongo 查询中滥用无索引扫描。
