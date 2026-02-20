# 中华整木网 · Claude 超详细一步步生成顺序指令版

本文档按**生成顺序**拆成 10 段提示词，每段对应一个步骤。使用时**按顺序**将「本步提示词」复制给 Claude，可一段段喂出完整项目。

**整体定位**：行业知识基础设施，非营销站。风格：冷静、结构清晰、数据优先、极简、类似数据库平台。

---

## 步骤 1：项目骨架与基础配置

**本步目标**：创建 Next.js + TypeScript + Tailwind 项目结构、基础配置与目录规范，为后续步骤打好基础。

**输入上下文**：无（第一步）。可附带说明：项目名「中华整木网」，技术栈 Next.js、TypeScript、TailwindCSS，目标部署 Vercel。

**本步提示词**（可直接复制）：

```
请为「中华整木网」创建一个 Next.js 项目骨架。

要求：
- 使用 Next.js 14+（App Router）+ TypeScript
- 集成 TailwindCSS，做好基础样式与 CSS 变量（便于后续统一风格）
- 目录结构包含：app/（含 layout、各栏目占位路由）、components/、lib/、types/、public/
- 配置 tsconfig、next.config、tailwind.config，支持 SSR，便于部署到 Vercel
- 在 README 中简要说明目录规范与启动命令

风格：极简、结构清晰，这是行业知识基础设施项目，不是营销站。
只生成项目骨架与配置，不要生成业务数据或复杂页面。
```

---

## 步骤 2：Prisma 数据模型与迁移说明

**本步目标**：根据《CLAUDE_CODE_GEN_GUIDE》中的数据模型设计，编写完整 Prisma schema（Term、Standard、Brand、IndustryData、Member），并给出迁移与种子数据说明。

**输入上下文**：步骤 1 已生成的项目目录与 package.json；数据表字段见 CLAUDE_CODE_GEN_GUIDE.md 第二部分「二、数据模型设计」。

**本步提示词**（可直接复制）：

```
在现有中华整木网 Next.js 项目中，添加 Prisma 并设计数据模型。

要求：
1. 安装并配置 Prisma（PostgreSQL），schema 放在 prisma/schema.prisma
2. 定义以下模型（字段按下面要求，类型请自行合理选择）：
   - Term：id, title, slug(唯一), definition, background, features, structure, significance, version, updatedAt
   - Standard：id, title, code, year, content, version, updatedAt
   - Brand：id, name, positioning, materialSystem, productStructure, priceRange, targetAudience, businessModel, updatedAt
   - IndustryData：id, title, source, methodology, content, year, updatedAt
   - Member：id, name, email(唯一), role, membershipLevel, passwordHash, 以及合理的时间戳字段
3. 为 slug、email 等加唯一索引；必要时加 @@map 保持表名清晰
4. 在 README 或 prisma/ 下补充：如何执行 migrate、如何添加 seed（可选）

不写业务 API，只完成 schema 与迁移说明。
```

---

## 步骤 3：信息架构路由与布局

**本步目标**：实现 7 个主栏目的路由与全局/栏目级布局，为后续各页模板提供路由与导航骨架。

**输入上下文**：步骤 1 的 app/ 目录；步骤 2 的 Prisma 已就绪。栏目路径：/dictionary, /standards, /market, /data, /news, /gallery, /membership。

**本步提示词**（可直接复制）：

```
在中华整木网项目中实现信息架构的路由与布局。

要求：
1. 在 app 下建立以下路由（每个栏目一个目录，可先占位页面）：
   - /dictionary（整木词库）
   - /standards（整木标准）
   - /market（整木市场）
   - /data（整木数据）
   - /news（整木资讯）
   - /gallery（整木图库）
   - /membership（会员系统）
2. 在 app/layout.tsx 中实现全局布局：站点名称、主导航（链接到以上 7 个栏目）、页脚（版权等）
3. 导航样式：极简、清晰，符合「知识基础设施」风格，不用营销化设计
4. 每个栏目页暂时只需渲染一个标题和简短说明，例如「整木词库 - 行业语义中心」

不实现具体词条/标准/品牌详情页，只做路由与布局。
```

---

## 步骤 4：词条页模板

**本步目标**：实现词条详情页模板，包含 H1、定义模块、分段结构、FAQ、JSON-LD 结构化数据、版本号显示。

**输入上下文**：步骤 1–3 的目录与布局；Prisma 中 Term 模型。内容结构规范：概念定义、发展背景、核心特征、技术结构、行业意义、相关词条、版本号。

**本步提示词**（可直接复制）：

```
在中华整木网中实现「词条」详情页模板（整木词库单条展示）。

要求：
1. 路由：/dictionary/[slug]，根据 slug 用 Prisma 查询 Term，不存在则 404
2. 页面结构（严格按顺序，H1 仅一个）：
   - H1：词条标题（title）
   - 定义模块：definition 突出展示（可单独区块或引用样式）
   - 分段：发展背景(background)、核心特征(features)、技术结构(structure)、行业意义(significance)，用 H2 分段
   - 相关词条：预留区块（可先展示链接列表或「待补充」）
   - 版本号与更新日期：显示 version、updatedAt
3. FAQ：页面内含一个 FAQ 区块，结构可写死 1～2 条示例，或从 Term 扩展字段读取（若 schema 无则用占位）
4. SEO：页面 meta title/description 使用词条 title 与 definition 摘要；输出 JSON-LD（DefinedTerm 或 Article，含 name、description、dateModified）
5. 样式：极简、层级清晰（H1/H2/H3），像知识库条目，不要营销话术

请给出 app/dictionary/[slug]/page.tsx 及所需的小组件或 lib 查询函数。
```

---

## 步骤 5：标准页模板

**本步目标**：实现标准详情页模板，包含标准编号突出显示、表格化等级系统、更新记录区块、引用格式模块。

**输入上下文**：步骤 3 的 /standards 路由；Prisma 中 Standard 模型。内容结构：标准编号、发布年份、等级划分、指标说明、应用范围、更新记录。

**本步提示词**（可直接复制）：

```
在中华整木网中实现「标准」详情页模板（整木标准单条展示）。

要求：
1. 路由：/standards/[id] 或 /standards/[code]，用 Prisma 查询 Standard
2. 页面结构：
   - 标准编号（code）突出显示，可作为标题或标题旁显著标签
   - 发布年份（year）、标题（title）
   - 等级/指标：用表格展示（若 content 为 JSON 或 Markdown，可解析；否则用简单表格占位）
   - 应用范围：单独段落或列表
   - 更新记录：version、updatedAt，以及「更新记录」区块
   - 引用格式：固定格式区块，例如「本标准引用格式：中华整木网，标准编号 xxx，年份」
3. SEO：meta 与 JSON-LD（Standard 或 TechArticle），含 name、description、dateModified
4. 样式：表格清晰、编号醒目，整体偏文档/规范风格
```

---

## 步骤 6：品牌页模板

**本步目标**：实现品牌详情页模板，包含品牌信息卡片、结构对比区块、标签系统与可扩展对比功能预留。

**输入上下文**：步骤 3 的 /market 路由；Prisma 中 Brand 模型。内容结构：品牌定位、材料体系、产品结构、价格区间、适合人群、商业模式、结构对比模块。

**本步提示词**（可直接复制）：

```
在中华整木网中实现「品牌」详情页模板（整木市场品牌单条展示）。

要求：
1. 路由：/market/[id] 或 /market/[slug]，用 Prisma 查询 Brand（若无 slug 可用 id）
2. 页面结构：
   - 品牌信息卡片：name, positioning, materialSystem, productStructure, priceRange, targetAudience, businessModel，以卡片或键值对形式展示
   - 标签系统：预留标签区域（可来自 Brand 的 tags 字段或后续扩展），用于品类、档次等
   - 结构对比区块：预留「与同类品牌对比」模块，可先做 UI 骨架，数据后续接入
3. 表达中立：仅呈现事实与结构，不用营销话术
4. SEO：meta + JSON-LD（Organization 或 Product），含 name、description
5. 样式：信息密度高、结构清晰，便于对比阅读
```

---

## 步骤 7：数据页模板

**本步目标**：实现行业数据详情页模板，包含数据来源区块、可视化图表占位、年份筛选与下载按钮。

**输入上下文**：步骤 3 的 /data 路由；Prisma 中 IndustryData 模型。内容结构：数据来源、统计方法、市场规模、区域分布、品类结构、更新周期。

**本步提示词**（可直接复制）：

```
在中华整木网中实现「行业数据」详情页模板（整木数据单条展示）。

要求：
1. 路由：/data/[id]，用 Prisma 查询 IndustryData
2. 页面结构：
   - 数据来源区块：source 突出展示
   - 统计方法：methodology 单独段落
   - 内容区：content（支持 Markdown 或富文本）、年份 year
   - 可视化图表：预留图表组件占位（如「市场规模」「区域分布」「品类结构」），可先写死一个简单图表或占位 div，后续接入图表库
   - 年份筛选：列表页 /data 支持按 year 筛选（本步可只做详情页，列表筛选在步骤 8 或 10 统一做）
   - 下载按钮：预留「导出/下载」按钮，可先为链接或按钮占位
3. 更新周期：在页脚或侧边说明更新周期（可从 content 或单独字段读取）
4. SEO：meta + JSON-LD（Dataset 或 Article）
5. 风格：数据优先、来源可追溯，偏报告/年鉴风格
```

---

## 步骤 8：SEO 与结构化数据

**本步目标**：实现 sitemap.xml、robots.txt、Open Graph、页面 meta 自动生成、URL 规范化及结构化数据示例汇总。

**输入上下文**：步骤 1–7 的路由与页面；各内容模型（Term、Standard、Brand、IndustryData）。

**本步提示词**（可直接复制）：

```
在中华整木网中完善 SEO 与结构化数据。

要求：
1. sitemap.xml：使用 Next.js 的 app/sitemap.ts（或 pages 下的 getServerSideProps/静态方法），汇总首页、/dictionary、/standards、/market、/data、/news、/gallery 的 URL；若有动态路由，从 Prisma 拉取词条、标准、品牌、数据的 slug/id 生成 URL，含 lastmod
2. robots.txt：app/robots.txt 或路由生成，允许爬虫，指向 sitemap
3. 全局 meta：在 layout 中设置默认 title、description、viewport；各栏目与详情页在各自 layout 或 page 中覆盖 title/description
4. Open Graph：为关键页（首页、词条、标准、品牌、数据）添加 og:title、og:description、og:type、og:url（可选 og:image）
5. URL 规范化：确保 canonical 使用绝对 URL；无重复斜杠、统一小写（若适用）
6. 结构化数据：在词条、标准、品牌、数据页中已输出的 JSON-LD 基础上，检查类型与必填字段；在首页或布局中可增加 WebSite 的 JSON-LD（含 potentialAction SearchAction 预留）

风格：不夸大、不营销，符合知识型站点规范。
```

---

## 步骤 9：会员登录与 API 预留

**本步目标**：实现会员登录（JWT）、API 路由预留，以及标签、版本管理、管理后台等可扩展点说明或占位。

**输入上下文**：步骤 2 的 Member 模型；步骤 3 的 /membership 路由。

**本步提示词**（可直接复制）：

```
在中华整木网中实现会员相关功能与 API 预留。

要求：
1. 会员登录：/membership 下提供登录页（表单：email + 密码）；提交后调用 API 校验（与 Prisma Member 表比对 passwordHash，使用 bcrypt 或类似），成功后签发 JWT，写入 cookie 或 localStorage，并跳转到会员中心或首页
2. 注册与权限：可只做登录；若做注册，需对 password 做 hash 再存库。角色与 membershipLevel 用于后续权限控制，本步可只读不写
3. API 预留：
   - /api/auth/login、/api/auth/logout（或 session 失效）
   - /api/terms、/api/standards、/api/brands、/api/industry-data：只读列表或详情，供未来前端或第三方调用；可加简单分页与查询参数
4. 可扩展点（代码内注释或 README 说明即可）：
   - 标签系统：Term/Brand 等可扩展 tags 字段或关联表
   - 内容版本管理：可对 Term/Standard 等做版本表或 version 字段变更记录
   - 管理后台：预留 /admin 路由或说明后续可接 Next.js 后台
5. 安全：API 中敏感操作需校验 JWT；不在前端暴露 passwordHash
```

---

## 步骤 10：组件规范与部署说明

**本步目标**：整理组件设计规范、提供 1～2 个示例通用组件，并编写 Vercel 部署说明。

**输入上下文**：步骤 1–9 的全部产出；项目为 Next.js + TypeScript + Tailwind + Prisma。

**本步提示词**（可直接复制）：

```
为中华整木网做最后的规范与部署收尾。

要求：
1. 组件设计规范：在 docs 或 README 中写一段「组件规范」：命名（如 PascalCase）、目录（components/ui、components/domain）、Props 用 TypeScript 接口、样式统一用 Tailwind、避免内联营销文案
2. 示例组件：提供 1～2 个可复用组件，例如：
   - Card：用于词条摘要、品牌卡片、数据卡片等，含标题、描述、链接
   - DefinitionBlock：用于词条页的定义突出展示
   代码放在 components/ 下，并在词条页或品牌页中引用示例
3. 部署说明（README 或 docs/DEPLOYMENT.md）：
   - 环境变量：DATABASE_URL、JWT_SECRET 等
   - 构建命令：npm run build（或 pnpm/yarn）
   - 部署到 Vercel：连接仓库、配置 env、Prisma 在 build 时执行 prisma generate（若用 serverless 可说明 migrate 在 CI 或本地执行）
   - 若使用 Cloudflare Pages/Workers，可加一句「也可尝试适配 Cloudflare（需调整 Prisma 与 Node 运行时）」
4. 再次强调：整木网是「行业知识基础设施」，风格冷静、数据优先、极简、类似数据库平台；组件与文案保持中立。
```

---

## 使用说明

- 按**步骤 1 → 10** 顺序执行；每步完成后再进行下一步。
- 「本步提示词」整段复制到 Claude 即可；必要时在对话中附上一步的产出（如「当前 app 目录结构如下：…」）。
- 若某步已由人工实现，可将「输入上下文」改为「当前实现说明」，再让 Claude 做增量或检查。
- 全部完成后，项目应具备：路由与布局、词条/标准/品牌/数据页模板、SEO 与 JSON-LD、会员登录与 API 预留、组件示例与部署说明。
