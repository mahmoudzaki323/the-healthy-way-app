#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME="${PROJECT_NAME:-the-healthy-way}"
ORG_ID="${SUPABASE_ORG_ID:-ramelxmnevkavjibdroo}"
REGION="${SUPABASE_REGION:-us-west-1}"
SIZE="${SUPABASE_SIZE:-}"
COACH_EMAIL="${COACH_EMAIL:-}"

if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI is required." >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required." >&2
  exit 1
fi

sql_quote() {
  printf "'%s'" "$(printf '%s' "$1" | sed "s/'/''/g")"
}

if [[ -z "${SUPABASE_PROJECT_REF:-}" && -f supabase/.temp/project-ref ]]; then
  SUPABASE_PROJECT_REF="$(tr -d '[:space:]' < supabase/.temp/project-ref)"
fi

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  SUPABASE_DB_PASSWORD="$(openssl rand -base64 30 | tr -d '=+/ ' | cut -c1-24)"
  if [[ -z "${SUPABASE_PROJECT_REF:-}" ]]; then
    GENERATED_PASSWORD="true"
  else
    GENERATED_PASSWORD="false"
    USE_GENERATED_LINK_PASSWORD="false"
  fi
else
  GENERATED_PASSWORD="false"
  USE_GENERATED_LINK_PASSWORD="true"
fi

if [[ -z "${SUPABASE_PROJECT_REF:-}" ]]; then
  echo "Creating Supabase project '${PROJECT_NAME}' in org '${ORG_ID}'..."
  CREATE_JSON="$(mktemp)"
  CREATE_ARGS=(
    "${PROJECT_NAME}"
    --org-id "${ORG_ID}" \
    --db-password "${SUPABASE_DB_PASSWORD}" \
    --region "${REGION}" \
    --yes \
    --output json
  )
  if [[ -n "${SIZE}" ]]; then
    CREATE_ARGS+=(--size "${SIZE}")
  fi
  if ! supabase projects create "${CREATE_ARGS[@]}" > "${CREATE_JSON}"; then
    rm -f "${CREATE_JSON}"
    echo "Supabase project creation failed. If this is a free-project limit, pause/delete another active free project or upgrade the org, then rerun." >&2
    exit 1
  fi
  SUPABASE_PROJECT_REF="$(jq -r '.id // .ref' "${CREATE_JSON}")"
  rm -f "${CREATE_JSON}"
fi

if [[ -z "${SUPABASE_PROJECT_REF}" || "${SUPABASE_PROJECT_REF}" == "null" ]]; then
  echo "Unable to determine SUPABASE_PROJECT_REF." >&2
  exit 1
fi

echo "Linking Supabase project ${SUPABASE_PROJECT_REF}..."
LINK_ARGS=(--project-ref "${SUPABASE_PROJECT_REF}")
if [[ "${USE_GENERATED_LINK_PASSWORD:-true}" == "true" ]]; then
  LINK_ARGS+=(--password "${SUPABASE_DB_PASSWORD}")
fi
supabase link "${LINK_ARGS[@]}"

echo "Pushing migrations and seed data..."
PUSH_ARGS=(--linked --include-seed)
if [[ "${USE_GENERATED_LINK_PASSWORD:-true}" == "true" ]]; then
  PUSH_ARGS+=(--password "${SUPABASE_DB_PASSWORD}")
fi
supabase db push "${PUSH_ARGS[@]}"

COACH_INVITE_CODE="${COACH_INVITE_CODE:-HW-COACH-$(openssl rand -hex 4 | tr '[:lower:]' '[:upper:]')}"
if [[ -n "${COACH_EMAIL}" ]]; then
  COACH_EMAIL_SQL="$(sql_quote "${COACH_EMAIL}")"
  COACH_INVITE_LABEL="${COACH_EMAIL}"
else
  COACH_EMAIL_SQL="null"
  COACH_INVITE_LABEL="any email"
fi
COACH_CODE_SQL="$(sql_quote "${COACH_INVITE_CODE}")"

echo "Creating one-time coach invitation..."
supabase db query --linked "
insert into public.invitations (code, email, role, expires_at)
values (${COACH_CODE_SQL}, ${COACH_EMAIL_SQL}, 'coach', now() + interval '30 days')
on conflict (code) do update set
  email = excluded.email,
  role = excluded.role,
  expires_at = excluded.expires_at,
  accepted_at = null;
"

echo "Fetching anon key..."
KEYS_JSON="$(supabase projects api-keys --project-ref "${SUPABASE_PROJECT_REF}" --output json)"
SUPABASE_ANON_KEY="$(printf '%s' "${KEYS_JSON}" | jq -r '.[] | select(.name == "anon" or .name == "anon key") | .api_key // .key' | head -n 1)"

if [[ -z "${SUPABASE_ANON_KEY}" || "${SUPABASE_ANON_KEY}" == "null" ]]; then
  echo "Unable to read Supabase anon key." >&2
  exit 1
fi

SUPABASE_URL="https://${SUPABASE_PROJECT_REF}.supabase.co"
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"

cat > .env.local <<ENV
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
NEXT_PUBLIC_APP_URL=${APP_URL}
ENV

if [[ -n "${COACH_EMAIL}" ]]; then
  printf 'COACH_EMAIL=%s\n' "${COACH_EMAIL}" >> .env.local
fi

chmod 600 .env.local

cat <<SUMMARY

Supabase is linked and migrations/seed were pushed.

Project ref: ${SUPABASE_PROJECT_REF}
Project URL: ${SUPABASE_URL}
Local env:   .env.local

Set the Supabase Auth Site URL and redirect URLs in the Supabase dashboard after Vercel deployment:
- Site URL: https://<vercel-production-domain>
- Redirect URL: https://<vercel-production-domain>/auth/callback

Coach invite code for ${COACH_INVITE_LABEL}: ${COACH_INVITE_CODE}
Use this once when creating the coach account in the app.

SUMMARY

if [[ "${GENERATED_PASSWORD}" == "true" ]]; then
  cat <<PASSWORD_NOTE
Database password was generated for this run. Store it in your password manager now:
${SUPABASE_DB_PASSWORD}

PASSWORD_NOTE
fi
