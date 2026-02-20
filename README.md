# 中华整木网

整木行业知识基础设施与会员共建平台。非营销网站，风格：冷静、结构清晰、数据优先、极简。

## 技术栈

- Next.js 14+ (App Router) + TypeScript
- TailwindCSS
- Prisma + PostgreSQL
- 部署目标：Vercel

## 目录规范

- `app/` — 路由与页面（layout、各栏目、动态路由）
- `components/` — 可复用 UI 组件（如 Header、Footer、Card、DefinitionBlock）
- `lib/` — 工具、Prisma 客户端、API 辅助
- `types/` — TypeScript 类型
- `prisma/` — Schema、迁移、种子
- `public/` — 静态资源

## 运行与预览

**首次使用先安装依赖：**

```bash
cd d:\desktop\WEB
npm install
```

**方式一：开发模式（改代码自动刷新）**

```bash
npm run dev
```

浏览器打开：<http://localhost:3000>

**方式二：编译后生产预览**

```bash
npm run build
npm run start
```

浏览器打开：<http://localhost:3000>

**关闭服务**：在运行 `npm run dev` 或 `npm run start` 的终端里按 `Ctrl + C`。

## 数据库

```bash
# 生成 Prisma Client
npm run db:generate

# 推送 schema 到数据库（开发）
npm run db:push

# 正式迁移（生产推荐）
npm run db:migrate

# 种子数据（可选）
npm run db:seed
```

## 栏目路径

- `/dictionary` 整木词库
- `/standards` 整木标准
- `/market` 整木市场
- `/data` 整木数据
- `/news` 整木资讯
- `/gallery` 整木图库
- `/membership` 会员系统

## 文档

- [组件规范](docs/COMPONENTS.md)
- [部署说明](docs/DEPLOYMENT.md)
