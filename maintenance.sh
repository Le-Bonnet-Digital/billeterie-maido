#!/usr/bin/env bash
set -euo pipefail

npm install

if command -v supabase >/dev/null; then
  supabase migration up
fi
