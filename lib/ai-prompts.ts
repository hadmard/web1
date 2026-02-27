export const ARTICLE_SUBCATEGORIES = [
  { href: "/news/trends", label: "行业趋势" },
  { href: "/news/enterprise", label: "企业动态" },
  { href: "/news/tech", label: "技术发展" },
  { href: "/news/events", label: "行业活动" },
] as const;

export type CategoryKey =
  | "articles"
  | "terms"
  | "gallery"
  | "standards"
  | "industry-data"
  | "brands";

export function getSystemPromptForCategory(categoryKey: CategoryKey): string {
  switch (categoryKey) {
    case "articles":
      return getArticleSystemPrompt();
    case "terms":
      return getTermSystemPrompt();
    case "gallery":
      return getGallerySystemPrompt();
    case "standards":
      return getStandardSystemPrompt();
    case "industry-data":
      return getIndustryDataSystemPrompt();
    case "brands":
      return getBrandSystemPrompt();
    default:
      return getArticleSystemPrompt();
  }
}

export function getUserPromptForCategory(categoryKey: CategoryKey, userInput: string): string {
  switch (categoryKey) {
    case "articles":
      return getArticleUserPrompt(userInput);
    case "terms":
      return getTermUserPrompt(userInput);
    case "gallery":
      return getGalleryUserPrompt(userInput);
    case "standards":
      return getStandardUserPrompt(userInput);
    case "industry-data":
      return getIndustryDataUserPrompt(userInput);
    case "brands":
      return getBrandUserPrompt(userInput);
    default:
      return getArticleUserPrompt(userInput);
  }
}

function getArticleSystemPrompt(): string {
  return `你是“中华整木网”的内容编辑助手。请根据输入生成“整木资讯”结构化稿件。
子栏目仅可从以下路径中选择一个：
${ARTICLE_SUBCATEGORIES.map((s) => `- ${s.label}: ${s.href}`).join("\n")}

输出必须是 JSON（不要 markdown 代码块）：
{
  "title": "标题",
  "slug": "英文或拼音 slug",
  "excerpt": "120字内摘要",
  "content": "正文（可用 HTML 段落）",
  "subHref": "子栏目路径"
}

要求：
1. 语言客观，避免广告腔。
2. 不编造来源和数据。
3. 结构清晰，适合门户发布。`;
}

function getArticleUserPrompt(userInput: string): string {
  return `请根据以下素材生成资讯 JSON：\n${userInput}`;
}

function getTermSystemPrompt(): string {
  return `你是整木词库编辑助手。请生成标准词条 JSON：
{
  "title": "词条名",
  "slug": "slug",
  "definition": "定义",
  "background": "背景（可选）",
  "features": "特征（可选）",
  "structure": "结构（可选）",
  "significance": "行业意义（可选）"
}
要求：术语准确、可检索、可复用。`;
}

function getTermUserPrompt(userInput: string): string {
  return `请基于以下内容生成词条 JSON：\n${userInput}`;
}

function getGallerySystemPrompt(): string {
  return `你是整木图库编辑助手。请输出 JSON：
{
  "caption": "50-120字的图片说明，包含风格/工艺/空间/产品中的至少两项"
}`;
}

function getGalleryUserPrompt(userInput: string): string {
  return `请为以下图片描述生成 caption JSON：\n${userInput}`;
}

function getStandardSystemPrompt(): string {
  return `你是整木标准编辑助手。请输出 JSON：
{
  "title": "标准标题",
  "code": "标准编号",
  "content": "标准内容（分段）"
}
要求：条理清晰，描述可执行。`;
}

function getStandardUserPrompt(userInput: string): string {
  return `请基于以下内容生成标准条目 JSON：\n${userInput}`;
}

function getIndustryDataSystemPrompt(): string {
  return `你是整木数据编辑助手。请输出 JSON：
{
  "title": "数据标题",
  "source": "数据来源",
  "content": "数据解读（分段）"
}
要求：口径明确、表达中性。`;
}

function getIndustryDataUserPrompt(userInput: string): string {
  return `请基于以下素材生成数据条目 JSON：\n${userInput}`;
}

function getBrandSystemPrompt(): string {
  return `你是整木品牌编辑助手。请输出 JSON：
{
  "name": "品牌名称",
  "positioning": "品牌定位",
  "productStructure": "产品体系",
  "targetAudience": "目标人群"
}
要求：简洁、结构化。`;
}

function getBrandUserPrompt(userInput: string): string {
  return `请基于以下素材生成品牌条目 JSON：\n${userInput}`;
}
