#!/usr/bin/env bash
set -euo pipefail

echo "▶ Installing Node deps"
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

# (optionnel) supprimer les warnings proxy npm
npm config delete http-proxy || true
npm config delete https-proxy || true

# ---- Variables/Secrets requis (fail fast lisible)
: "${SUPABASE_PROJECT_REF:?Missing SUPABASE_PROJECT_REF}"          # ex: rvotxqsgaolddvpqbkhy
: "${SUPABASE_ACCESS_TOKEN:?Missing SUPABASE_ACCESS_TOKEN}"        # token API Supabase

: "${SB_URL:?Missing SB_URL}"                                      # https://<project-ref>.supabase.co
: "${SB_SERVICE_ROLE_KEY:?Missing SB_SERVICE_ROLE_KEY}"            # service_role key
: "${STRIPE_SECRET:?Missing STRIPE_SECRET}"                        # Stripe secret key
: "${WEBHOOK_SECRET:?Missing WEBHOOK_SECRET}"                      # Stripe webhook secret
: "${RESEND_API_KEY:?Missing RESEND_API_KEY}"                      # Resend API key
: "${FROM_EMAIL:?Missing FROM_EMAIL}"                              # ex: no-reply@parcdelaluge.re

echo "▶ Preparing secrets for Edge Functions (names only):"
echo "   SB_URL, SB_SERVICE_ROLE_KEY, STRIPE_SECRET, WEBHOOK_SECRET, RESEND_API_KEY, FROM_EMAIL"

# ---- Écrire un .env temporaire (sécurisé) puis pousser avec supabase CLI
umask 077
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

{
  echo "SB_URL=${SB_URL}"
  echo "SB_SERVICE_ROLE_KEY=${SB_SERVICE_ROLE_KEY}"
  echo "STRIPE_SECRET=${STRIPE_SECRET}"
  echo "WEBHOOK_SECRET=${WEBHOOK_SECRET}"
  echo "RESEND_API_KEY=${RESEND_API_KEY}"
  echo "FROM_EMAIL=${FROM_EMAIL}"
} > "$tmp"

echo "▶ Setting Edge Function secrets on project ${SUPABASE_PROJECT_REF}"
SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN}" \
  npx -y supabase@latest secrets set \
  --project-ref "${SUPABASE_PROJECT_REF}" \
  --env-file "$tmp"

echo "✅ setup.sh completed"
