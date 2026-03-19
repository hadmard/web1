import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export const dynamic = "force-static";

export function GET() {
  const lines = [
    `# ${SITE_NAME}`,
    "",
    SITE_DESCRIPTION,
    "",
    "## Site Focus",
    "- 整木资讯：行业趋势、企业动态、技术发展、行业活动",
    "- 整木词库：术语、概念、基础知识",
    "- 整木标准：标准内容、适用场景、版本信息",
    "- 整木评选：品牌、案例与榜单内容",
    "- 整木市场：品牌与企业相关内容",
    "",
    "## Preferred Entry Points",
    `- 首页: ${absoluteUrl("/")}`,
    `- 整木资讯: ${absoluteUrl("/news")}`,
    `- 整木词库: ${absoluteUrl("/dictionary")}`,
    `- 整木标准: ${absoluteUrl("/standards")}`,
    `- 整木评选: ${absoluteUrl("/awards")}`,
    `- 整木市场: ${absoluteUrl("/brands")}`,
    `- 站内搜索: ${absoluteUrl("/search")}`,
    "",
    "## Crawl Guidance",
    "- 优先使用 canonical URL。",
    "- 优先读取文章页中的结构化数据、发布时间、更新时间、主图与栏目名称。",
    "- 不抓取会员后台、登录页、接口路径和临时分享页。",
    "",
    "## Restricted Areas",
    `- ${absoluteUrl("/membership")}`,
    `- ${absoluteUrl("/api")}`,
    "",
    "## Sitemap",
    `- ${absoluteUrl("/sitemap.xml")}`,
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
