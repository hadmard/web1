import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_URLS = [
  "https://cnzhengmu.com/news/cnews",
  "https://cnzhengmu.com/index.php?m=news&c=shows&id=207",
  "https://cnzhengmu.com/index.php?m=product&c=shows&id=981746066",
  "https://cnzhengmu.com/index.php?m=download&c=shows&id=123",
  "https://cnzhengmu.com/index.php?m=unknown&c=list&id=1",
  "https://cnzhengmu.com/product/981746066",
  "https://cnzhengmu.com/download/123",
  "https://jiu.cnzhengmu.com/index.php?m=unknown&c=list&id=1",
];

const args = process.argv.slice(2);
const outputDirArg = args.find((x) => x.startsWith("--output-dir="));
const listFileArg = args.find((x) => x.startsWith("--list="));
const maxRedirectsArg = args.find((x) => x.startsWith("--max-redirects="));

const maxRedirects = Number.parseInt(maxRedirectsArg?.split("=")[1] ?? "5", 10);
const outputDir = path.resolve(outputDirArg?.split("=")[1] ?? "custom/reports");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

async function loadUrls() {
  if (!listFileArg) return DEFAULT_URLS;
  const filePath = path.resolve(listFileArg.split("=")[1]);
  const raw = await fs.readFile(filePath, "utf8");
  return raw
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function normalizeLocation(baseUrl, location) {
  try {
    return new URL(location, baseUrl).toString();
  } catch {
    return location;
  }
}

function toCsvField(value) {
  const text = String(value ?? "");
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

async function fetchWithManualRedirects(originalUrl) {
  const chain = [];
  let currentUrl = originalUrl;

  for (let i = 0; i <= maxRedirects; i += 1) {
    chain.push(currentUrl);

    try {
      const response = await fetch(currentUrl, {
        method: "GET",
        redirect: "manual",
        headers: {
          "user-agent": "CodexLegacyVerifier/1.0",
        },
      });

      const location = response.headers.get("location") ?? "";
      if ([301, 302, 307, 308].includes(response.status) && location) {
        currentUrl = normalizeLocation(currentUrl, location);
        continue;
      }

      return {
        originalUrl,
        finalUrl: currentUrl,
        statusCode: response.status,
        location,
        chain,
        outcome:
          response.status >= 200 && response.status < 300
            ? "ok"
            : response.status >= 300 && response.status < 400
              ? "redirect"
              : response.status === 404
                ? "not_found"
                : "error_status",
        error: "",
      };
    } catch (error) {
      return {
        originalUrl,
        finalUrl: currentUrl,
        statusCode: -1,
        location: "",
        chain,
        outcome: "network_error",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return {
    originalUrl,
    finalUrl: currentUrl,
    statusCode: -2,
    location: "",
    chain,
    outcome: "redirect_loop",
    error: `Exceeded redirect limit (${maxRedirects})`,
  };
}

async function main() {
  const urls = await loadUrls();
  await fs.mkdir(outputDir, { recursive: true });

  const results = [];
  for (const url of urls) {
    // Never abort the batch for a single bad URL.
    // Every URL produces one result row.
    results.push(await fetchWithManualRedirects(url));
  }

  const csvPath = path.join(outputDir, `legacy-url-check-${timestamp}.csv`);
  const txtPath = path.join(outputDir, `legacy-url-check-${timestamp}.txt`);
  const latestCsvPath = path.join(outputDir, "legacy-url-check-latest.csv");
  const latestTxtPath = path.join(outputDir, "legacy-url-check-latest.txt");

  const csvLines = [
    ["originalUrl", "finalUrl", "statusCode", "outcome", "location", "error", "chain"].join(","),
    ...results.map((row) =>
      [
        row.originalUrl,
        row.finalUrl,
        row.statusCode,
        row.outcome,
        row.location,
        row.error,
        row.chain.join(" -> "),
      ]
        .map(toCsvField)
        .join(",")
    ),
  ];

  const summary = {
    total: results.length,
    ok: results.filter((x) => x.outcome === "ok").length,
    redirects: results.filter((x) => x.chain.length > 1).length,
    notFound: results.filter((x) => x.statusCode === 404).length,
    errors: results.filter((x) => x.statusCode < 0 || (x.statusCode >= 500 && x.statusCode <= 599)).length,
  };

  const txtLines = [
    `Legacy URL verification report`,
    `GeneratedAt=${new Date().toISOString()}`,
    `Total=${summary.total}`,
    `OK=${summary.ok}`,
    `Redirected=${summary.redirects}`,
    `NotFound=${summary.notFound}`,
    `Errors=${summary.errors}`,
    `---`,
    ...results.flatMap((row) => [
      `URL=${row.originalUrl}`,
      `FINAL=${row.finalUrl}`,
      `STATUS=${row.statusCode}`,
      `OUTCOME=${row.outcome}`,
      row.location ? `LOCATION=${row.location}` : "",
      row.error ? `ERROR=${row.error}` : "",
      `CHAIN=${row.chain.join(" -> ")}`,
      `---`,
    ]),
  ].filter(Boolean);

  await fs.writeFile(csvPath, csvLines.join("\n"), "utf8");
  await fs.writeFile(txtPath, txtLines.join("\n"), "utf8");
  await fs.writeFile(latestCsvPath, csvLines.join("\n"), "utf8");
  await fs.writeFile(latestTxtPath, txtLines.join("\n"), "utf8");

  console.log(`CSV=${csvPath}`);
  console.log(`TXT=${txtPath}`);
  console.log(`TOTAL=${summary.total}`);
  console.log(`OK=${summary.ok}`);
  console.log(`REDIRECTED=${summary.redirects}`);
  console.log(`NOT_FOUND=${summary.notFound}`);
  console.log(`ERRORS=${summary.errors}`);

  process.exit(summary.notFound > 0 || summary.errors > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
