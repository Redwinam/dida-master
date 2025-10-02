#!/bin/sh
set -e

MODE="${APP_MODE:-web}"

if [ "$MODE" = "web" ]; then
  echo "[entry] starting web front-end on ${HOST:-0.0.0.0}:${PORT:-5000}"
  exec /usr/local/bin/python3 -u /app/webapp.py
elif [ "$MODE" = "both" ]; then
  echo "[entry] starting web + cron (combined mode)"
  echo "${CRON_SCHEDULE} /bin/sh -c '/usr/local/bin/python3 -u /app/ai_daily_note.py'" > /crontab
  echo '--- /crontab ---'
  cat /crontab
  supercronic -test /crontab || true
  if [ "${RUN_ON_START:-true}" = "true" ]; then
    /usr/local/bin/python3 -u /app/ai_daily_note.py || true
  fi
  /usr/local/bin/supercronic -debug -json /crontab &
  echo "[entry] supercronic started in background (PID $!)"
  exec /usr/local/bin/python3 -u /app/webapp.py
else
  echo "[entry] starting cron scheduler (mode=${MODE})"
  echo "${CRON_SCHEDULE} /bin/sh -c '/usr/local/bin/python3 -u /app/ai_daily_note.py'" > /crontab
  echo '--- /crontab ---'
  cat /crontab
  supercronic -test /crontab || true
  if [ "${RUN_ON_START:-true}" = "true" ]; then
    /usr/local/bin/python3 -u /app/ai_daily_note.py || true
  fi
  exec /usr/local/bin/supercronic -debug -json /crontab
fi