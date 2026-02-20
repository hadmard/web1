# 部署说明

## 环境变量

在 Vercel 或本地 `.env` 中配置：

- `DATABASE_URL` — PostgreSQL 连接串，例如：
  - `postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public`
- `JWT_SECRET` — 会员登录 JWT 签名密钥，生产环境必须设置强随机串。
- `NEXT_PUBLIC_SITE_URL` — 站点绝对 URL，用于 sitemap、robots、OG，例如：
  - `https://zhengmu.example.com`

## 构建与启动

```bash
npm install
npm run db:generate   # 生成 Prisma Client
npm run build
npm run start
```

- 部署前需在目标数据库执行迁移：`npm run db:migrate`（建议在 CI 或部署脚本中执行，或使用托管 DB 的 migrate 能力）。
- Vercel 在 build 阶段会自动执行 `prisma generate`（若在 `postinstall` 中配置）或于 build 命令中显式加入 `prisma generate`。

## 部署到 Vercel

1. 将仓库连接至 Vercel，选择该 Next.js 项目。
2. 在项目 Settings → Environment Variables 中配置 `DATABASE_URL`、`JWT_SECRET`、`NEXT_PUBLIC_SITE_URL`。
3. 构建命令使用默认 `npm run build`（或 `pnpm build` / `yarn build`）。
4. 数据库迁移：在 Vercel 的 Build 前或使用 Vercel 的 Postgres 等集成时，在本地或 CI 执行 `npx prisma migrate deploy`，确保生产 DB 已应用迁移。

## 其他平台

- **Cloudflare Pages / Workers**：需注意 Prisma 与 Node 运行时兼容性，部分边缘环境需使用 Prisma Data Proxy 或 REST 方案，可按需适配。
