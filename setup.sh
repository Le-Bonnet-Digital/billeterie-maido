#!/usr/bin/env bash
set -euo pipefail

echo "▶ Installing Node deps"
npm install

# (Optionnel) nettoyer un warning npm proxy bruyant
npm config delete http-proxy || true
npm config delete https-proxy || true

# ---- Variables nécessaires (fail fast lisible)
: "${SUPABASE_URL:?Missing SUPABASE_URL}"
: "${SUPABASE_SERVICE_ROLE_KEY:?Missing SUPABASE_SERVICE_ROLE_KEY}"
: "${STRIPE_SECRET:?Missing STRIPE_SECRET}"
: "${WEBHOOK_SECRET:?Missing WEBHOOK_SECRET}"

# ---- Pousser les secrets vers Supabase Edge Functions via CLI sans installation globale
# Requiert : SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF
if [ -n "${SUPABASE_ACCESS_TOKEN:-}" ] && [ -n "${SUPABASE_PROJECT_REF:-}" ]; then
  echo "▶ Setting Edge Function secrets on project ${SUPABASE_PROJECT_REF}"
  cat <<'SECRETS' | SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN}" \
    npx -y supabase@latest secrets set --project-ref "${SUPABASE_PROJECT_REF}" --env-file -
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
STRIPE_SECRET=${STRIPE_SECRET}
WEBHOOK_SECRET=${WEBHOOK_SECRET}
SECRETS
else
  echo "⚠️  SUPABASE_ACCESS_TOKEN ou SUPABASE_PROJECT_REF manquant(s) — je saute l'étape 'supabase secrets set'."
fi

# ---- Migrations (facultatif, seulement si tu veux les appliquer côté projet)
# Active uniquement si tu ajoutes SUPABASE_RUN_MIGRATIONS=true
if [ "${SUPABASE_RUN_MIGRATIONS:-false}" = "true" ]; then
  if [ -n "${SUPABASE_ACCESS_TOKEN:-}" ] && [ -n "${SUPABASE_PROJECT_REF:-}" ]; then
    echo "▶ Applying migrations on remote project ${SUPABASE_PROJECT_REF}"
    SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN}" \
      npx -y supabase@latest migration up --project-ref "${SUPABASE_PROJECT_REF}"
  else
    echo "⚠️  Migrations non lancées (token/ref manquants)."
  fi
fi

echo "✅ setup.sh completed"
