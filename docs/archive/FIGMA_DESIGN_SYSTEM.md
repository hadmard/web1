# 中华整木网 · Figma 设计系统规则（Design-to-Code）

本文档供 Figma MCP 与 AI 生成前端代码时使用，保证设计与代码库一致。

---

## 1. Design Tokens

**定义位置**：`app/globals.css`（`:root`） + `tailwind.config.ts`（`theme.extend`）

| Token 类型 | 定义方式 | 示例 |
|------------|----------|------|
| 背景/表面 | CSS 变量 `--color-surface` | 亮色 `#ffffff`，暗色 `#111827` |
| 边框 | `--color-border` | 亮 `#e5e7eb`，暗 `#374151` |
| 弱化文字 | `--color-muted` | 亮 `#6b7280`，暗 `#9ca3af` |
| 字体 | `--font-sans` | `ui-sans-serif, system-ui, sans-serif` |

Tailwind 中通过 `bg-[var(--color-surface)]`、`border-[var(--color-border)]`、`text-[var(--color-muted)]` 使用。  
正文/标题使用 Tailwind 的 `text-gray-900` / `dark:text-gray-100`，需同时写 dark 变体以支持系统深色模式。

---

## 2. 组件库

**路径**：`components/`（根目录）

- **Header**（`Header.tsx`）：顶部导航，`navItems: { href, label }[]`，极简链接样式。
- **Footer**（`Footer.tsx`）：页脚版权与说明。
- **Card**（`Card.tsx`）：卡片，支持 `title`、`description`、`href`、`children`；有 `href` 时为 `Link`，否则为 `div`。
- **DefinitionBlock**（`DefinitionBlock.tsx`）：词条定义区块，`definition: string`，左侧竖线引用样式。
- **JsonLd**（`JsonLd.tsx`）：注入 JSON-LD，`data: object`。

**约定**：组件名 PascalCase，Props 用 TypeScript 接口，样式仅用 Tailwind + 上述 CSS 变量，无内联 style。

---

## 3. 技术栈

- **框架**：Next.js 14+（App Router）+ React 18
- **语言**：TypeScript
- **样式**：TailwindCSS，无 CSS Modules / Styled Components
- **构建**：Next.js 自带（Vercel 部署）

生成代码须为 **React + TypeScript + Tailwind**，路径使用 `@/` 别名（如 `@/components/Header`）。

---

## 4. 资源与图标

- 静态资源：`public/`，引用为 `/xxx`。
- 暂无统一图标库；若设计中有图标，优先用 SVG 内联或 `public` 下的 SVG 文件。

---

## 5. 样式约定

- **布局**：主内容区 `max-w-4xl` 或 `max-w-3xl mx-auto px-4 py-10`。
- **导航**：Header 高度 `h-14`，`max-w-6xl mx-auto`，链接 `text-sm text-[var(--color-muted)] hover:text-gray-900 dark:hover:text-gray-100`。
- **卡片/区块**：`border border-[var(--color-border)] rounded-lg`，hover 时 `hover:bg-gray-50 dark:hover:bg-gray-800/50`。
- **标题层级**：每页仅一个 H1（`text-2xl font-semibold`），H2 `text-lg font-medium`，H3 `text-sm font-medium`。
- **响应式**：Tailwind 断点（`sm:`、`md:` 等），列表常用 `grid gap-4 sm:grid-cols-2`。

---

## 6. 项目结构

```
app/           # 路由与页面（layout.tsx, page.tsx, [slug]/ 等）
components/    # 共享 UI 组件
lib/           # 工具、Prisma、API 辅助
types/         # 全局类型
prisma/        # Schema 与迁移
public/        # 静态资源
docs/          # 文档（含本设计系统说明）
```

---

## 7. 产品定位

中华整木网为**行业知识基础设施**，非营销站。  
设计风格：冷静、结构清晰、数据优先、极简、类似数据库/知识平台；避免营销话术与花哨装饰。

---

在 Figma 中设计时，请尽量使用上述 token 与组件语义（如「卡片」「定义区块」「导航项」），生成代码时引用 `@/components/*` 与 `var(--color-*)`，以保证与现有代码一致。
