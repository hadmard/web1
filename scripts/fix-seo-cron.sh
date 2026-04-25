#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/home/web1}"
SCRIPT="$APP_DIR/scripts/run-seo-news-cron.sh"
LOG_DIR="$APP_DIR/logs"
LOG_FILE="$LOG_DIR/seo-news-cron.log"
STATUS_FILE="$LOG_DIR/seo-news-cron-status.json"

echo "== 1. Check app directory and cron script =="
[ -d "$APP_DIR" ] || { echo "ERROR: $APP_DIR does not exist"; exit 1; }
[ -f "$SCRIPT" ] || { echo "ERROR: $SCRIPT does not exist"; exit 1; }
chmod +x "$SCRIPT"

echo "== 2. Enable SEO auto generation =="
if [ -f "$APP_DIR/.env.production" ]; then
  ENV_FILE="$APP_DIR/.env.production"
elif [ -f "$APP_DIR/.env" ]; then
  ENV_FILE="$APP_DIR/.env"
else
  ENV_FILE="$APP_DIR/.env.production"
  touch "$ENV_FILE"
fi

if grep -q '^SEO_NEWS_AUTOGEN_ENABLED=' "$ENV_FILE"; then
  sed -i 's/^SEO_NEWS_AUTOGEN_ENABLED=.*/SEO_NEWS_AUTOGEN_ENABLED=true/' "$ENV_FILE"
else
  printf '\nSEO_NEWS_AUTOGEN_ENABLED=true\n' >> "$ENV_FILE"
fi

grep -n '^SEO_NEWS_AUTOGEN_ENABLED=' "$ENV_FILE"

echo "== 3. Install production SEO cron =="
mkdir -p "$LOG_DIR"

TMP_CRON="$(mktemp)"
{
  crontab -l 2>/dev/null | grep -F -v 'CRON_TZ=Asia/Shanghai' | grep -F -v "$SCRIPT" || true
  echo 'CRON_TZ=Asia/Shanghai'
  echo "30 7 * * * /bin/bash $SCRIPT --count 3"
  echo "40 7 * * * /bin/bash $SCRIPT --mode check"
  echo "0 8 * * * /bin/bash $SCRIPT --mode check"
} > "$TMP_CRON"

crontab "$TMP_CRON"
rm -f "$TMP_CRON"

echo "== 4. Current crontab =="
crontab -l

echo "== 5. Run one manual SEO generation now =="
cd "$APP_DIR"
/bin/bash "$SCRIPT" --count 3 --mode manual

echo "== 6. Recent cron log =="
tail -n 120 "$LOG_FILE"

echo "== 7. Current status file =="
cat "$STATUS_FILE"

echo "== 8. Recovery hint =="
today="$(date +%F)"
if ! tail -n 120 "$LOG_FILE" | grep -Fq 'SKIP seo news generation disabled by SEO_NEWS_AUTOGEN_ENABLED' \
  && grep -Fq "\"generationBatchId\":\"dual-seo-$today-" "$STATUS_FILE"; then
  echo "SEO generation pipeline looks recovered: recent log is not a disabled-switch SKIP, and status.json contains today's generationBatchId."
else
  echo "Please keep checking: if recent logs still show the disabled-switch SKIP, or status.json does not contain today's generationBatchId, the pipeline is not fully restored yet."
fi
