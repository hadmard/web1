import { importNewsFromList } from "../lib/news-import";

function readArg(name: string) {
  const hit = process.argv.find((item) => item.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? "" : "";
}

async function main() {
  const listUrl = readArg("listUrl").trim();
  if (!listUrl) {
    console.error("Usage: npm run import:news -- --listUrl <url> [--sourceName 来源] [--limit 10] [--include /news/] [--dryRun]");
    process.exitCode = 1;
    return;
  }

  const includeArg = readArg("include").trim();
  const result = await importNewsFromList({
    listUrl,
    sourceName: readArg("sourceName").trim() || undefined,
    limit: Number(readArg("limit") || 10),
    includePatterns: includeArg ? includeArg.split(",").map((item) => item.trim()).filter(Boolean) : [],
    timeoutMs: Number(readArg("timeoutMs") || 12000),
    dryRun: process.argv.includes("--dryRun"),
  });

  console.log(JSON.stringify(result, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
