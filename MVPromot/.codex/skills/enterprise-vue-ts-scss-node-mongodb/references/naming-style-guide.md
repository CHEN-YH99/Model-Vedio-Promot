# 命名与风格规范（严格）

## 1. 文件与目录命名

| 对象 | 规则 | 示例 |
| --- | --- | --- |
| 目录名 | `kebab-case` | `order-center` |
| Vue 组件文件 | `PascalCase.vue` | `OrderCard.vue` |
| TS 普通文件 | `kebab-case.ts` | `order-filter.ts` |
| Composable | `useXxx.ts` | `useOrderFilters.ts` |
| Store 文件 | `xxx.store.ts` | `order.store.ts` |
| 测试文件 | `*.spec.ts` 或 `*.test.ts` | `order.service.spec.ts` |
| SCSS 文件 | `kebab-case.scss` | `order-card.scss` |
| 路由路径 | `kebab-case` | `/order-center/order-list` |
| MongoDB 集合 | 小写复数 + 下划线 | `order_items` |

## 2. 代码符号命名

| 对象 | 规则 | 示例 |
| --- | --- | --- |
| 变量/函数 | `camelCase` | `fetchOrderList` |
| 类型/接口/类/枚举 | `PascalCase` | `OrderQueryDto` |
| 常量 | `UPPER_SNAKE_CASE` | `MAX_RETRY_COUNT` |
| 布尔变量 | `is/has/can/should` 前缀 | `isArchived` |
| 事件处理函数 | `handleXxx` | `handleSubmit` |
| 工厂函数 | `createXxx` | `createOrderService` |

## 3. Vue 组件命名约束

- UI 基础组件使用明确前缀，如 `BaseButton.vue`、`AppModal.vue`。
- 业务组件用业务前缀，如 `OrderCard.vue`、`OrderFilterPanel.vue`。
- 页面组件以 `Page` 结尾，如 `OrderListPage.vue`。
- 一个组件只承载一个主要职责，不用“万能组件”混装业务。

## 4. SCSS 命名与组织

- 使用 BEM：`.block`、`.block__element`、`.block--modifier`。
- 状态类统一 `is-*` / `has-*`，如 `.is-loading`。
- 样式变量统一写在 token 文件中，避免硬编码颜色与间距。

示例：

```scss
.order-card {
  &__title {}
  &__meta {}
  &--highlight {}
}
```

## 5. 禁止项

- 禁止拼音缩写、单字符语义命名（循环变量除外）。
- 禁止 `data`, `temp`, `obj`, `list2` 这类弱语义名称。
- 禁止前后端命名风格混用（如同层同时存在 snake_case 与 camelCase 文件名）。

## 6. 命名评审清单

- 新增文件名能否通过“看名知义”。
- 同一业务域内命名模式是否一致。
- 公开接口命名是否表达输入与输出语义。
- 缩写是否为团队公认标准（如 `URL`, `HTTP`, `ID`）。
