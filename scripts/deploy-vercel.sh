#!/usr/bin/env bash
# Deploy to Vercel from the command line.
#
# Needs two things you have to create yourself, because they require signing
# into accounts:
#
#   VERCEL_TOKEN   vercel.com/account/tokens -> Create Token
#   DATABASE_URL   a Postgres connection string, e.g. from neon.tech
#
# Usage:
#   VERCEL_TOKEN=xxx DATABASE_URL='postgresql://...' bash scripts/deploy-vercel.sh
set -euo pipefail
cd "$(dirname "$0")/.."

: "${VERCEL_TOKEN:?set VERCEL_TOKEN — create one at vercel.com/account/tokens}"
: "${DATABASE_URL:?set DATABASE_URL — a Postgres connection string}"

PROJECT="${PROJECT:-medilean}"
ENVFILE="${ENVFILE:-}"

# Secrets: reuse the ones already generated, or make new ones.
if [ -n "$ENVFILE" ] && [ -f "$ENVFILE" ]; then
  PHI_ENC_KEY="$(grep -oP '^PHI_ENC_KEY=\K.*' "$ENVFILE")"
  SESSION_SECRET="$(grep -oP '^SESSION_SECRET=\K.*' "$ENVFILE")"
else
  PHI_ENC_KEY="${PHI_ENC_KEY:-$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")}"
  SESSION_SECRET="${SESSION_SECRET:-$(node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))")}"
fi

echo "==> linking project '$PROJECT'"
vercel link --yes --project "$PROJECT" --token "$VERCEL_TOKEN" >/dev/null

put() {
  # Replace rather than append, so re-running is safe.
  vercel env rm "$1" production --yes --token "$VERCEL_TOKEN" >/dev/null 2>&1 || true
  printf '%s' "$2" | vercel env add "$1" production --token "$VERCEL_TOKEN" >/dev/null
  echo "    $1"
}

echo "==> setting environment variables"
put DATABASE_URL "$DATABASE_URL"
put PHI_ENC_KEY "$PHI_ENC_KEY"
put SESSION_SECRET "$SESSION_SECRET"
put STORAGE_DRIVER "db"
put SHOW_VERIFICATION_CODE "${SHOW_VERIFICATION_CODE:-true}"

echo "==> deploying"
URL="$(vercel deploy --prod --yes --token "$VERCEL_TOKEN" | tail -1)"
echo "    $URL"

echo "==> pointing APP_URL at the deployment"
put APP_URL "$URL"
vercel deploy --prod --yes --token "$VERCEL_TOKEN" >/dev/null
echo "    redeployed so APP_URL takes effect"

echo "==> seeding demo data"
DATABASE_URL="$DATABASE_URL" PHI_ENC_KEY="$PHI_ENC_KEY" npm run db:seed

echo
echo "==> done: $URL"
echo "    Keep this key somewhere safe. Without it the data is unreadable:"
echo "    PHI_ENC_KEY=$PHI_ENC_KEY"
