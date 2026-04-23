#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/home/web1"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/seo-news-cron.log"
STATUS_FILE="$LOG_DIR/seo-news-cron-status.json"
LOCK_FILE="/tmp/seo-news-cron.lock"
COUNT="3"
MODE="cron"
TRIGGER_SOURCE="cron"
PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${PATH:-}"
export PATH
export TZ="${TZ:-Asia/Shanghai}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --count)
      COUNT="${2:-3}"
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

if [[ "$MODE" == "manual" ]]; then
  TRIGGER_SOURCE="manual"
elif [[ "$MODE" == "cron" ]]; then
  TRIGGER_SOURCE="cron"
else
  TRIGGER_SOURCE="check"
fi

mkdir -p "$LOG_DIR"
touch "$LOG_FILE"
if [[ "$MODE" == "manual" ]]; then
  exec > >(tee -a "$LOG_FILE") 2>&1
else
  exec >>"$LOG_FILE" 2>&1
fi

timestamp() {
  date "+%Y-%m-%d %H:%M:%S %Z"
}

log() {
  echo "[$(timestamp)] $*"
}

write_status() {
  local status="$1"
  local stage="$2"
  local message="$3"
  local batch_id="${4:-}"
  local saved_count="${5:-}"
  local trigger_source="${6:-$TRIGGER_SOURCE}"

  cat >"$STATUS_FILE" <<EOF
{"updatedAt":"$(date -Iseconds)","tz":"${TZ:-Asia/Shanghai}","status":"$status","stage":"$stage","message":"$message","generationBatchId":"$batch_id","savedCount":"$saved_count","mode":"$MODE","triggerSource":"$trigger_source"}
EOF
}

extract_trigger_source() {
  local batch_id="${1:-}"
  case "$batch_id" in
    *-manual-*) echo "manual" ;;
    *-cron-*) echo "cron" ;;
    *-dry_run-*) echo "dry_run" ;;
    *) echo "unknown" ;;
  esac
}

load_env() {
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
    log "FAIL env file not found in $PROJECT_DIR"
    write_status "error" "env" "env file not found in $PROJECT_DIR"
    exit 1
  fi
}

log "START mode=$MODE triggerSource=$TRIGGER_SOURCE project_dir=$PROJECT_DIR args=\"$*\""

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "SKIP another seo-news generation is still running lock_file=$LOCK_FILE"
  exit 0
fi

cd "$PROJECT_DIR"

NODE_BIN="$(command -v node || true)"
NPM_BIN="$(command -v npm || true)"
NPX_BIN="$(command -v npx || true)"

if [[ -z "$NODE_BIN" || -z "$NPM_BIN" || -z "$NPX_BIN" ]]; then
  log "FAIL required runtime missing node=${NODE_BIN:-missing} npm=${NPM_BIN:-missing} npx=${NPX_BIN:-missing}"
  exit 1
fi

COMMAND_STRING="$NPM_BIN run generate:dual-line-seo -- --count $COUNT --approved false --timezone Asia/Shanghai --trigger-source $TRIGGER_SOURCE"

load_env

AUTO_GEN_ENABLED="false"
if [[ "${SEO_NEWS_AUTOGEN_ENABLED:-false}" == "true" ]]; then
  AUTO_GEN_ENABLED="true"
fi

log "ENV loaded file=$ENV_FILE database_url_present=${DATABASE_URL:+yes}"
log "SEO_NEWS_AUTOGEN_ENABLED=$AUTO_GEN_ENABLED"
log "RUNTIME node=$NODE_BIN npm=$NPM_BIN npx=$NPX_BIN pwd=$(pwd)"

if [[ "${SEO_NEWS_AUTOGEN_ENABLED:-false}" != "true" ]]; then
  log "SKIP seo news generation disabled by SEO_NEWS_AUTOGEN_ENABLED"
  write_status "skipped" "$MODE" "seo news generation disabled by SEO_NEWS_AUTOGEN_ENABLED"
  exit 0
fi

if [[ "$MODE" == "check" ]]; then
  log "ENTER seo news daily generation check"

  VERIFY_JSON="$("$NODE_BIN" - <<'NODE'
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const startOfDay = new Date();
startOfDay.setHours(0, 0, 0, 0);

(async () => {
  const latest = await prisma.article.findFirst({
    where: {
      source: "auto_dual_line_seo_generator",
      createdAt: { gte: startOfDay },
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      generationBatchId: true,
      createdAt: true,
    },
  });

  if (!latest?.generationBatchId) {
    console.log(
      JSON.stringify({
        ok: false,
        reason: "no_batch_generated_today",
        startOfDay: startOfDay.toISOString(),
      }),
    );
    return;
  }

  const rows = await prisma.article.findMany({
    where: {
      generationBatchId: latest.generationBatchId,
    },
    orderBy: [{ createdAt: "asc" }],
    select: {
      title: true,
      status: true,
      contentLine: true,
      categoryHref: true,
      subHref: true,
    },
  });

  console.log(
    JSON.stringify({
      ok: true,
      generationBatchId: latest.generationBatchId,
      createdAt: latest.createdAt.toISOString(),
      savedCount: rows.length,
      pendingCount: rows.filter((row) => row.status === "pending").length,
      items: rows,
    }),
  );
})()
  .catch((error) => {
    console.log(JSON.stringify({ ok: false, reason: error?.message || String(error) }));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
NODE
)"

  if [[ -z "$VERIFY_JSON" || "$VERIFY_JSON" != *'"ok":true'* ]]; then
    log "ALERT seo news generation missing or invalid today payload=${VERIFY_JSON:-empty}"
    write_status "error" "check" "${VERIFY_JSON:-no verification payload}"
    exit 1
  fi

  batch_id="$(printf '%s' "$VERIFY_JSON" | sed -n 's/.*"generationBatchId":"\([^"]*\)".*/\1/p' | head -n 1)"
  saved_count="$(printf '%s' "$VERIFY_JSON" | sed -n 's/.*"savedCount":\([0-9][0-9]*\).*/\1/p' | head -n 1)"
  trigger_source="$(extract_trigger_source "$batch_id")"
  log "CHECK_OK $VERIFY_JSON"
  write_status "ok" "check" "today batch exists" "${batch_id:-}" "${saved_count:-}" "${trigger_source:-unknown}"
  exit 0
fi

log "ENTER generate seo news"

RUN_OUTPUT="$(mktemp /tmp/seo-news-run.XXXXXX.log)"
START_ISO="$(date -Iseconds)"

set +e
$COMMAND_STRING >"$RUN_OUTPUT" 2>&1
EXIT_CODE=$?
set -e

cat "$RUN_OUTPUT"

if [[ "$EXIT_CODE" -ne 0 ]]; then
  log "FAIL seo news generation command exit_code=$EXIT_CODE"
  tail -n 80 "$RUN_OUTPUT" || true
  write_status "error" "generate" "seo news generation command exit_code=$EXIT_CODE" "" "" "$TRIGGER_SOURCE"
  rm -f "$RUN_OUTPUT"
  exit "$EXIT_CODE"
fi

VERIFY_JSON="$("$NODE_BIN" - "$START_ISO" <<'NODE'
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const since = new Date(process.argv[2]);

(async () => {
  const latest = await prisma.article.findFirst({
    where: {
      source: "auto_dual_line_seo_generator",
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
  const autoSeoCount = rows.filter((row) => row.source === "auto_dual_line_seo_generator").length;

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

if [[ -z "$VERIFY_JSON" ]]; then
  log "FAIL verify output missing"
  write_status "error" "verify" "verify output missing" "" "" "$TRIGGER_SOURCE"
  rm -f "$RUN_OUTPUT"
  exit 1
fi

if [[ "$VERIFY_JSON" != *'"ok":true'* ]]; then
  log "FAIL verify step returned unexpected payload: $VERIFY_JSON"
  write_status "error" "verify" "$VERIFY_JSON" "" "" "$TRIGGER_SOURCE"
  rm -f "$RUN_OUTPUT"
  exit 1
fi

batch_id="$(printf '%s' "$VERIFY_JSON" | sed -n 's/.*"generationBatchId":"\([^"]*\)".*/\1/p' | head -n 1)"
saved_count="$(printf '%s' "$VERIFY_JSON" | sed -n 's/.*"savedCount":\([0-9][0-9]*\).*/\1/p' | head -n 1)"
pending_count="$(printf '%s' "$VERIFY_JSON" | sed -n 's/.*"pendingCount":\([0-9][0-9]*\).*/\1/p' | head -n 1)"

log "VERIFY $VERIFY_JSON"
log "SUCCESS generated_saved_count=${saved_count:-unknown} pending_count=${pending_count:-unknown}"
write_status "ok" "generate" "generation succeeded" "${batch_id:-}" "${saved_count:-}" "$TRIGGER_SOURCE"

rm -f "$RUN_OUTPUT"
