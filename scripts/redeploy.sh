#!/usr/bin/env bash
# Rebuild and restart in the right order.
#
# `next start` serves the .next directory it found at boot. Rebuilding under a
# running server replaces those files, and the server then asks for chunks that
# no longer exist — the page loads with no styles and the console fills with 500s
# on a stylesheet. Stop first, build, then start.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-3000}"

echo "==> stopping anything on :$PORT"
PID="$(ss -ltnp 2>/dev/null | grep ":$PORT" | grep -oP 'pid=\K[0-9]+' | head -1 || true)"
if [ -n "$PID" ]; then kill "$PID" 2>/dev/null || true; sleep 2
  kill -9 "$PID" 2>/dev/null || true; sleep 1
fi

echo "==> building"
rm -rf .next
npm run build

echo "==> starting"
nohup npm run start > /tmp/medilean-server.log 2>&1 &
disown

for _ in $(seq 1 60); do
  curl -sf -o /dev/null "http://localhost:$PORT/" && break || sleep 1
done

CSS="$(curl -s "http://localhost:$PORT/" | grep -oE '/_next/static/[^"]+\.css' | head -1 || true)"
CODE="$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT$CSS" 2>/dev/null || echo 000)"
if [ "$CODE" = "200" ]; then
  echo "==> up, and the stylesheet it references loads ($CSS)"
else
  echo "==> WARNING: stylesheet returned $CODE — the build and the server disagree"
  exit 1
fi
