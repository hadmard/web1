# Prisma 使用说明（PostgreSQL）

## 环境变量
在项目根目录 `.env` 中配置：

- `DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"`

示例（本地）：

- `DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/web1?schema=public"`

## 常用命令

```bash
# 生成 Prisma Client（修改 schema 后执行）
npx prisma generate

# 将 schema 同步到数据库（开发环境推荐）
npx prisma db push

# 生成并执行迁移（团队协作/生产推荐）
npx prisma migrate dev --name <migration_name>

# 填充种子数据
npx prisma db seed
```

## 首次迁移说明

当前仓库已切换为 PostgreSQL，并提供初始迁移：

- `prisma/migrations/20260228000000_init_postgresql/migration.sql`

如果你从旧 SQLite 环境迁移：

1. 先备份旧数据。
2. 配置新的 PostgreSQL `DATABASE_URL`。
3. 执行 `npx prisma migrate dev` 或 `npx prisma db push`。
4. 执行 `npx prisma db seed` 初始化基础数据。
