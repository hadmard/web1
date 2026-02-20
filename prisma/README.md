# Prisma 使用说明

## 本地开发（当前默认）

项目已配置为 **SQLite**，无需安装或启动 PostgreSQL：

- `.env` 中 `DATABASE_URL="file:./prisma/dev.db"`
- 数据库文件：`prisma/dev.db`（已加入 .gitignore）
- 迁移与 seed 已就绪，可直接运行 `npx prisma migrate dev`、`npx prisma db seed`

## 环境变量

在项目根目录的 `.env` 中：

- **本地**：`DATABASE_URL="file:./prisma/dev.db"`
- **生产**：若改用 PostgreSQL，将 `DATABASE_URL` 改为你的 Postgres 连接串，并需把 `prisma/schema.prisma` 的 `provider` 改回 `postgresql` 后重新生成迁移。

## 常用命令

```bash
# 生成 Prisma Client（改 schema 后执行）
npx prisma generate

# 创建并应用迁移
npx prisma migrate dev --name 迁移名称

# 填充种子数据（词条、主账号、大类小类等）
npx prisma db seed
```

## 种子数据说明

`seed.ts` 会创建：

- 演示词条（如「整木」）
- 主账号：`admin@example.com`（默认密码 `admin123`）
- 演示会员：`demo@example.com`（默认密码 `demo123`）
- 八大类及小类（与站点导航一致）
