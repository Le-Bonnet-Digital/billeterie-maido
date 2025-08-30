#!/usr/bin/env bash
set -euo pipefail

echo "▶ Installing Node deps"
npm ci || npm install

# Nettoie les warnings NPM proxy (facultatif)
npm config delete http-proxy || true
npm config delete https-proxy || true

# -- Variables requises (fail fast lisible)
: "${SUPABASE_URL:?Missing SUPABASE_URL}"
: "${SUPABASE_SERVICE_ROLE_KEY:?Missing SUPABASE_SERVICE_ROLE_KEY}"
: "${STRIPE_SECRET:?Missing STRIPE_SECRET}"
: "${WEBHOOK_SECRET:?Missing WEBHOOK_SECRET}"
: "${SUPABASE_PROJECT_REF:?Missing SUPABASE_PROJECT_REF}"
: "${SUPABASE_ACCESS_TOKEN:?Missing SUPABASE_ACCESS_TOKEN}"

echo "▶ Preparing env file for Supabase secrets"
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
{
  echo "SUPABASE_URL=${SUPABASE_URL}"
  echo "SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}"
  echo "STRIPE_SECRET=${STRIPE_SECRET}"
  echo "WEBHOOK_SECRET=${WEBHOOK_SECRET}"
} > "$tmp"

echo "▶ Setting Edge Function secrets on project ${SUPABASE_PROJECT_REF}"
SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN}" \
  npx -y supabase@latest secrets set \
  --project-ref "${SUPABASE_PROJECT_REF}" \
  --env-file "$tmp"

# (Optionnel) Lancer les migrations distantes si tu le souhaites
if [ "${SUPABASE_RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "▶ Applying migrations on ${SUPABASE_PROJECT_REF}"
  SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN}" \
    npx -y supabase@latest migration up --project-ref "${SUPABASE_PROJECT_REF}"
fi

echo "✅ setup.sh completed"
