#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/home/web1"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/seo-news-cron.log"
LOCK_FILE="/tmp/seo-news-cron.lock"
COUNT="2"
MODE="cron"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --count)
      COUNT="${2:-2}"
      shift 2
      ;;
    --mode)
      MODE="${2:-cron}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

mkdir -p "$LOG_DIR"
touch "$LOG_FILE"

if [[ "${SEO_CRON_TEE_STDOUT:-0}" == "1" ]]; then
  exec > >(tee -a "$LOG_FILE") 2>&1
else
  exec >>"$LOG_FILE" 2>&1
fi

timestamp() {
  date "+%Y-%m-%d %H:%M:%S %Z"
}

echo "[$(timestamp)] START mode=$MODE project_dir=$PROJECT_DIR command=\"npm run generate:seo-news -- --count $COUNT\""

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "[$(timestamp)] SKIP another seo-news generation is still running lock_file=$LOCK_FILE"
  exit 0
fi

cd "$PROJECT_DIR"

if [[ -f .env.production ]]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.production
  set +a
  ENV_FILE=".env.production"
elif [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
  ENV_FILE=".env"
else
  echo "[$(timestamp)] FAIL env file not found in $PROJECT_DIR"
  exit 1
fi

echo "[$(timestamp)] ENV loaded file=$ENV_FILE database_url_present=${DATABASE_URL:+yes}"

RUN_OUTPUT="$(mktemp /tmp/seo-news-run.XXXXXX.log)"
START_ISO="$(date -Iseconds)"

set +e
npm run generate:seo-news -- --count "$COUNT" >"$RUN_OUTPUT" 2>&1
EXIT_CODE=$?
set -e

cat "$RUN_OUTPUT"

if [[ "$EXIT_CODE" -ne 0 ]]; then
  echo "[$(timestamp)] FAIL exit_code=$EXIT_CODE"
  tail -n 80 "$RUN_OUTPUT" || true
  rm -f "$RUN_OUTPUT"
  exit "$EXIT_CODE"
fi

VERIFY_JSON="$(node - "$START_ISO" <<'NODE'
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const since = new Date(process.argv[2]);

(async () => {
  const latest = await prisma.article.findFirst({
    where: {
      source: "auto_seo_generator",
      createdAt: { gte: since },
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      generationBatchId: true,
    },
  });

  if (!latest?.generationBatchId) {
    console.error(JSON.stringify({ ok: false, reason: "no_recent_batch_found", since: since.toISOString() }));
    process.exit(1);
  }

  const rows = await prisma.article.findMany({
    where: {
      generationBatchId: latest.generationBatchId,
    },
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      source: true,
      generationBatchId: true,
      createdAt: true,
      categoryHref: true,
      subHref: true,
    },
  });

  const pendingCount = rows.filter((row) => row.status === "pending").length;
  const autoSeoCount = rows.filter((row) => row.source === "auto_seo_generator").length;

  console.log(
    JSON.stringify({
      ok: true,
      generationBatchId: latest.generationBatchId,
      savedCount: rows.length,
      pendingCount,
      autoSeoCount,
      statuses: Array.from(new Set(rows.map((row) => row.status))),
      items: rows.map((row) => ({
        title: row.title,
        slug: row.slug,
        status: row.status,
        categoryHref: row.categoryHref,
        subHref: row.subHref,
      })),
    }),
  );
})()
  .catch((error) => {
    console.error(JSON.stringify({ ok: false, reason: error?.message || String(error) }));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
NODE
)"

echo "[$(timestamp)] VERIFY $VERIFY_JSON"
echo "[$(timestamp)] SUCCESS"

rm -f "$RUN_OUTPUT"
