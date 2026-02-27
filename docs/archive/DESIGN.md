# 中华整木网 · 设计说明

本文档描述站点 UI 与视觉规范，便于前后端协作与后续迭代保持一致。

**SEO 与 AI 检索引用**：站点同时遵循 [SEO 与 AI/GEO 设计规则](./SEO_AND_AI_RULES.md)，以利于搜索引擎抓取与 AI 检索引用。新页或改版时请一并对照该规则。

---

## 1. 设计原则

- **贴合主题**：整木行业知识基础设施，偏专业、可信、克制，避免花哨动效与干扰元素。
- **色彩层次**：采用「五光十色的白」与「五彩斑斓的黑」，通过低饱和度色相变化区分区块，避免纯白/纯黑。
- **高可读与性能**：动效仅用 `transform`、`opacity`，尊重 `prefers-reduced-motion`，保证高帧率与无障碍。

---

## 2. 色彩系统

| 用途       | 变量 / 类名           | 说明                         |
|------------|------------------------|------------------------------|
| 主背景     | `--color-surface`      | 浅色：珍珠灰；深色：深蓝黑   |
| 暖区背景   | `--color-surface-warm` | 略偏暖，用于首屏焦点等      |
| 冷区背景   | `--color-surface-cool` | 略偏冷，用于交替区块    |
| 抬升背景   | `--color-surface-elevated` | 卡片、按钮底           |
| 主文字     | `--color-primary`     | 深色/浅色随主题             |
| 弱化文字   | `--color-muted`       | 副标题、说明                 |
| 强调色     | `--color-accent`       | 金/琥珀，主 CTA、标签       |
| 辅助强调   | `--color-accent-teal`  | 青绿，整木市场、品牌区      |
| 边框       | `--color-border-warm` / `--color-border-cool` | 与区块冷暖对应 |

渐变与光晕见 `app/globals.css` 中的 `--gradient-hero`、`--gradient-mesh`、`--glow-amber`、`--glow-teal`。

---

## 3. 字体与层级

- **标题**：Noto Serif SC（`font-serif`），用于 H1/H2/H3、区块标签。
- **正文**：Noto Sans SC（`font-sans`），用于段落、链接、按钮文案。
- **区块标签**：统一使用 `.section-label`（小号、全大写、字间距加宽），颜色用 `text-accent` 或 `text-accent-teal` 与区块语义对应。

---

## 4. 组件与区块

- **Hero**：纯 CSS 背景（渐变 + 弱光晕 mesh + 极淡竖线纹理 `.hero-pattern`），无粒子/光标特效。含眉标「知识基础设施」、主标题渐变、短装饰线、副标题与 3 个主 CTA（整木资讯 / 整木市场 / 整木词库）。
- **玻璃卡片**：`.glass-card`，半透明 + 极弱色相边框，hover 时弱光晕（`.hover-glow` / `.hover-glow-teal`）。
- **滚动飞进**：`ScrollReveal`，方向与延迟可配，进入视口时再播，离开重置。
- **大类首页**：`CategoryHome` 组件，面包屑 + 标题 + 描述 + 小类列表；小类链接到具体内容（词条/标准/品牌/文章等）。站点结构见 `lib/site-structure.ts`。

---

## 5. 动效与无障碍

- 入场：`hero-eyebrow` → `hero-title` → `hero-subtitle` 分步淡入（`hero-fade-in`）；滚动提示箭头轻微上下浮动。
- 滚动揭示：仅用 `opacity` + `transform`，缓动曲线 `cubic-bezier(0.22, 1, 0.36, 1)`。
- `prefers-reduced-motion: reduce` 时：入场与滚动揭示改为无动画或瞬时完成，弱化/关闭浮动。

---

## 6. 首页结构（自上而下）

1. **Hero**：眉标 + 标题 + 装饰线 + 副标题 + 3 CTA + 滚动提示
2. **十大推荐品牌**（置顶）：10 个品牌入口，点击进入整木市场
3. **全幅金句**：以定义为中心 · 以标准为资产 · 以数据为权威
4. **各大类单独呈现**：整木资讯、整木市场、整木词库、整木标准、整木数据、整木图库、整木评选、会员系统；每个大类一块，含标题、描述、小类链接、「进入 XX」入口。小类链接到具体内容（词条/标准/品牌/文章等）。

无广告位。站点结构（大类 ↔ 小类）由 `lib/site-structure.ts` 配置。

---

## 7. 文件与类名速查

| 文件 / 类名         | 作用                     |
|---------------------|--------------------------|
| `app/globals.css`   | 变量、Hero、玻璃卡、滚动揭示、区块标签 |
| `lib/site-structure.ts` | 大类与小类配置，供首页与 CategoryHome 使用 |
| `components/CategoryHome.tsx` | 大类首页布局：面包屑 + 标题 + 描述 + 小类列表 |
| `tailwind.config.ts` | 颜色、字体、阴影、过渡   |
| `.section-label`   | 区块小标题统一样式       |
| `.hero-pattern`     | Hero 极淡竖线纹理        |
| `.glass-card`      | 玻璃卡片                 |
| `.text-gradient`   | 标题金→青渐变字          |

新增页面或区块时，建议沿用上述变量与类名，以保持与整站主题一致。
