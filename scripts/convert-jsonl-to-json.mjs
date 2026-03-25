import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

function usage() {
  console.log("Usage: node scripts/convert-jsonl-to-json.mjs --input <file.jsonl> --output <file.json>");
}

const args = process.argv.slice(2);
let input = "";
let output = "";

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "--input") {
    input = args[i + 1] ?? "";
    i += 1;
    continue;
  }
  if (arg === "--output") {
    output = args[i + 1] ?? "";
    i += 1;
    continue;
  }
  if (arg === "--help" || arg === "-h") {
    usage();
    process.exit(0);
  }
}

if (!input || !output) {
  usage();
  process.exit(1);
}

const inputPath = resolve(input);
const outputPath = resolve(output);
const fileText = readFileSync(inputPath, "utf8").replace(/^\uFEFF/, "");
const lines = fileText.split(/\r?\n/);
const records = [];
let buffer = "";
let startLine = 0;

for (let index = 0; index < lines.length; index += 1) {
  const rawLine = lines[index];
  if (!buffer && rawLine.trim() === "") {
    continue;
  }

  if (!buffer) {
    startLine = index + 1;
    buffer = rawLine;
  } else {
    buffer += `\n${rawLine}`;
  }

  try {
    const candidate = buffer.trim();
    const decoded =
      candidate.startsWith("{") || candidate.startsWith("[")
        ? candidate
        : Buffer.from(candidate, "base64").toString("utf8");
    records.push(JSON.parse(decoded));
    buffer = "";
  } catch (error) {
    if (index === lines.length - 1) {
      throw new Error(`Invalid JSON starting on line ${startLine}: ${String(error)}`);
    }
  }
}

if (buffer.trim()) {
  throw new Error(`Incomplete JSON record starting on line ${startLine}`);
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(records, null, 2)}\n`, "utf8");
console.log(`[jsonl-convert] lines=${records.length}`);
console.log(`[jsonl-convert] output=${outputPath}`);
