#!/usr/bin/env bash
set -euo pipefail

echo "▶ Installing Node deps"
npm ci || npm install

# (silence les warnings proxy, pas bloquant)
npm config delete http-proxy || true
npm config delete https-proxy || true

# ---- Requis
: "${SUPABASE_PROJECT_REF:?Missing SUPABASE_PROJECT_REF}"
: "${SUPABASE_ACCESS_TOKEN:?Missing SUPABASE_ACCESS_TOKEN}"
: "${SB_URL:?Missing SB_URL}"                     # <- ex- SUPABASE_URL
: "${SB_SERVICE_ROLE_KEY:?Missing SB_SERVICE_ROLE_KEY}"  # <- ex- SUPABASE_SERVICE_ROLE_KEY
: "${STRIPE_SECRET:?Missing STRIPE_SECRET}"
: "${WEBHOOK_SECRET:?Missing WEBHOOK_SECRET}"

# ---- Secrets pour Edge Functions (pas de préfixe SUPABASE_)
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

# ---- Migrations (optionnelles)
# Active uniquement si tu fournis une URL Postgres explicite
# et que tu veux VRAIMENT les lancer dans le setup.
if [ "${SUPABASE_RUN_MIGRATIONS:-false}" = "true" ] && [ -n "${SUPABASE_DB_URL:-}" ]; then
  echo "▶ Applying migrations via DB URL"
  # ATTENTION : l'URL doit être percent-encodée si elle contient des caractères spéciaux
  SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN}" \
    npx -y supabase@latest migration up \
    --db-url "${SUPABASE_DB_URL}" \
    --include-all \
    --yes
else
  echo "ℹ️  Skipping migrations (set SUPABASE_RUN_MIGRATIONS=true and provide SUPABASE_DB_URL to enable)."
fi

echo "✅ setup.sh completed"
