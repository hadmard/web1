import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TARGET_TITLES = [
  "得诺整木：南浔整木工厂的 “稳定交付” 定义者",
  "什么是当代整木工厂？得诺整木给出行业标准答案",
  "为什么越来越多整木工厂关注康倍得整木专用板",
] as const;

function loadLocalEnvIfNeeded() {
  const envFiles = [resolve(process.cwd(), ".env.production"), resolve(process.cwd(), ".env")];
  for (const filePath of envFiles) {
    try {
      const content = readFileSync(filePath, "utf8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const separatorIndex = trimmed.indexOf("=");
        if (separatorIndex <= 0) continue;
        const key = trimmed.slice(0, separatorIndex).trim();
        if (!key || process.env[key]) continue;
        const rawValue = trimmed.slice(separatorIndex + 1).trim();
        process.env[key] =
          (rawValue.startsWith('"') && rawValue.endsWith('"')) || (rawValue.startsWith("'") && rawValue.endsWith("'"))
            ? rawValue.slice(1, -1)
            : rawValue;
      }
      break;
    } catch {
      continue;
    }
  }
}

function decodeHtmlEntities(input: string) {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
}

function repairEscapedNewsStructuredHtml(html?: string | null) {
  const source = (html || "").trim();
  if (!source) return "";

  const wrappedMatch = source.match(
    /^\s*<section>\s*<h3>([^<]{1,80})<\/h3>\s*<p>([\s\S]+)<\/p>\s*<\/section>\s*$/i,
  );
  if (!wrappedMatch) {
    return { matched: false, content: source };
  }

  const escapedInnerHtml = (wrappedMatch[2] || "").trim();
  if (!/&lt;(h1|h2|h3|p|a|img|ul|ol|li)\b/i.test(escapedInnerHtml)) {
    return { matched: false, content: source };
  }

  const decodedInnerHtml = decodeHtmlEntities(escapedInnerHtml).trim();
  if (!decodedInnerHtml || !/<(h1|h2|h3|p|a|img|ul|ol|li)\b/i.test(decodedInnerHtml)) {
    return { matched: false, content: source };
  }

  return { matched: true, content: decodedInnerHtml };
}

async function main() {
  loadLocalEnvIfNeeded();

  const rows = await prisma.article.findMany({
    where: {
      title: { in: [...TARGET_TITLES] },
      status: "approved",
      OR: [{ categoryHref: { startsWith: "/news" } }, { subHref: { startsWith: "/news" } }],
    },
    select: {
      id: true,
      slug: true,
      title: true,
      content: true,
      updatedAt: true,
    },
    orderBy: { title: "asc" },
  });

  const output = rows.map((row) => {
    const repaired = repairEscapedNewsStructuredHtml(row.content);
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      updatedAt: row.updatedAt,
      matched: repaired.matched,
      beforePreview: row.content.slice(0, 260),
      afterPreview: repaired.content.slice(0, 260),
    };
  });

  console.log(
    JSON.stringify(
      {
        targetCount: TARGET_TITLES.length,
        matchedCount: output.length,
        rows: output,
      },
      null,
      2,
    ),
  );
}

void main()
  .catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
