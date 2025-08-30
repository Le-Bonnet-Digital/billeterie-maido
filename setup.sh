#!/usr/bin/env bash
set -euo pipefail

echo "▶ Installing Node deps"
npm ci || npm install

# (optionnel) silence les warnings proxy npm
npm config delete http-proxy || true
npm config delete https-proxy || true

# ---- Requis pour pousser les secrets Edge
: "${SUPABASE_PROJECT_REF:?Missing SUPABASE_PROJECT_REF}"
: "${SUPABASE_ACCESS_TOKEN:?Missing SUPABASE_ACCESS_TOKEN}"
: "${SB_URL:?Missing SB_URL}"
: "${SB_SERVICE_ROLE_KEY:?Missing SB_SERVICE_ROLE_KEY}"
: "${STRIPE_SECRET:?Missing STRIPE_SECRET}"
: "${WEBHOOK_SECRET:?Missing WEBHOOK_SECRET}"

# ---- Pousser les secrets vers Supabase Edge Functions (NOMS SANS 'SUPABASE_')
umask 077
tmp="$(mktemp)"; trap 'rm -f "$tmp"' EXIT
{
  echo "SB_URL=${SB_URL}"
  echo "SB_SERVICE_ROLE_KEY=${SB_SERVICE_ROLE_KEY}"
  echo "STRIPE_SECRET=${STRIPE_SECRET}"
  echo "WEBHOOK_SECRET=${WEBHOOK_SECRET}"
} > "$tmp"

echo "▶ Setting Edge Function secrets on project ${SUPABASE_PROJECT_REF}"
SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN}" \
  npx -y supabase@latest secrets set \
  --project-ref "${SUPABASE_PROJECT_REF}" \
  --env-file "$tmp"

echo "✅ setup.sh completed"
