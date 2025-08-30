#!/usr/bin/env bash
set -euo pipefail

npm install

if command -v supabase >/dev/null; then
  supabase migration up
fi

: "${SUPABASE_SERVICE_ROLE_KEY:?Missing SUPABASE_SERVICE_ROLE_KEY}"
: "${STRIPE_SECRET:?Missing STRIPE_SECRET}"
: "${WEBHOOK_SECRET:?Missing WEBHOOK_SECRET}"

cat <<'SECRETS' | supabase secrets set --env-file -
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
STRIPE_SECRET=${STRIPE_SECRET}
WEBHOOK_SECRET=${WEBHOOK_SECRET}
SECRETS

