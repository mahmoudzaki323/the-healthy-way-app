#!/usr/bin/env bash
set -euo pipefail

if ! command -v vercel >/dev/null 2>&1; then
  echo "vercel CLI is required." >&2
  exit 1
fi

if [[ ! -f .env.local ]]; then
  echo ".env.local is missing. Run scripts/deploy-supabase.sh first." >&2
  exit 1
fi

set -a
source .env.local
set +a

required=(
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  NEXT_PUBLIC_APP_URL
)

for key in "${required[@]}"; do
  if [[ -z "${!key:-}" ]]; then
    echo "Missing ${key} in .env.local." >&2
    exit 1
  fi
done

if [[ "${NEXT_PUBLIC_APP_URL}" == http://localhost:* || "${NEXT_PUBLIC_APP_URL}" == http://127.0.0.1:* ]]; then
  echo "NEXT_PUBLIC_APP_URL points to localhost. Set it to the production Vercel URL before configuring Vercel env vars." >&2
  exit 1
fi

if [[ "${NEXT_PUBLIC_APP_URL}" != https://* ]]; then
  echo "NEXT_PUBLIC_APP_URL must be an https:// URL for Vercel deployments." >&2
  exit 1
fi

for env_name in production preview development; do
  echo "Configuring Vercel ${env_name} env vars..."
  printf '%s' "${NEXT_PUBLIC_SUPABASE_URL}" | vercel env add NEXT_PUBLIC_SUPABASE_URL "${env_name}" --force
  printf '%s' "${NEXT_PUBLIC_SUPABASE_ANON_KEY}" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY "${env_name}" --force
  printf '%s' "${NEXT_PUBLIC_APP_URL}" | vercel env add NEXT_PUBLIC_APP_URL "${env_name}" --force
  if [[ -n "${COACH_EMAIL:-}" ]]; then
    printf '%s' "${COACH_EMAIL}" | vercel env add COACH_EMAIL "${env_name}" --force
  fi
done

echo "Vercel env vars configured."
