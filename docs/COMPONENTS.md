# 组件设计规范

中华整木网为行业知识基础设施，非营销站。组件风格：冷静、结构清晰、数据优先、极简。

## 命名与目录

- **命名**：组件使用 PascalCase（如 `DefinitionBlock`、`Card`）。
- **目录**：
  - `components/` — 通用 UI（Header、Footer、Card、DefinitionBlock、JsonLd）。
  - 可按需增加 `components/ui/`（按钮、输入框）、`components/domain/`（词条卡片、标准表格）。
- **Props**：使用 TypeScript 接口定义，避免 `any`。

## 样式

- 统一使用 **TailwindCSS**，不写内联 style（除必要情况）。
- 使用项目 CSS 变量：`var(--color-surface)`、`var(--color-border)`、`var(--color-muted)`，以支持明暗主题。
- 层级：H1 仅一个/页，H2 分段，H3 子节。

## 文案与语义

- **中立表达**：仅呈现事实与结构，不带营销话术。
- 数据类组件优先展示「来源、时间、版本」等元信息。

## 示例组件

- **Card**（`components/Card.tsx`）：用于词条摘要、品牌卡片、数据卡片。支持 `title`、`description`、`href`、`children`。
- **DefinitionBlock**（`components/DefinitionBlock.tsx`）：词条页定义突出展示，引用样式区块。
- **JsonLd**（`components/JsonLd.tsx`）：注入 JSON-LD 脚本，传入 `data` 对象。
