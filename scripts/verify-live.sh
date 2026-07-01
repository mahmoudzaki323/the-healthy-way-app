#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-${NEXT_PUBLIC_APP_URL:-}}"

if [[ -z "${BASE_URL}" ]]; then
  echo "Usage: scripts/verify-live.sh https://your-app.vercel.app" >&2
  exit 1
fi

auth_body="$(curl -fsSL "${BASE_URL%/}/auth")"
if ! printf '%s' "${auth_body}" | grep -Fq "Welcome back"; then
  echo "Auth page did not render expected copy." >&2
  exit 1
fi

credential_or_link_pattern="$(
  printf '%s|%s|%s|%s|%s' \
    "HealthyWay""2026" \
    "client@""thehealthyway" \
    "coach@""thehealthyway" \
    "/dash""board" \
    "/ad""min"
)"
if printf '%s' "${auth_body}" | grep -Eq "${credential_or_link_pattern}"; then
  echo "Auth page leaked sample credentials or direct protected links." >&2
  exit 1
fi

protected_routes=(
  "/dashboard"
  "/programs"
  "/recipes"
  "/workouts"
  "/live-calls"
  "/goals"
  "/community"
  "/resources"
  "/messages"
  "/profile"
  "/settings"
  "/admin"
  "/admin/clients"
  "/admin/content"
  "/admin/schedule"
  "/admin/check-ins"
  "/admin/community"
  "/admin/messages"
  "/admin/settings"
)

for route in "${protected_routes[@]}"; do
  url="${BASE_URL%/}${route}"
  echo "Checking protected redirect ${url}"
  headers="$(curl -fsSI "${url}")"
  status="$(printf '%s\n' "${headers}" | awk 'NR==1 {print $2}')"
  location="$(printf '%s\n' "${headers}" | awk 'tolower($1) == "location:" {print $2}' | tr -d '\r')"

  if [[ "${status}" != "302" && "${status}" != "307" && "${status}" != "308" ]]; then
    echo "Expected protected redirect for ${url}, got HTTP ${status}." >&2
    exit 1
  fi

  if [[ "${location}" != *"/auth"* ]]; then
    echo "Expected ${url} to redirect to /auth, got ${location}." >&2
    exit 1
  fi
done

worksheet_headers="$(curl -fsSI "${BASE_URL%/}/resources/download?resource=pre-call-worksheet")"
if ! printf '%s' "${worksheet_headers}" | grep -Fqi 'content-disposition: attachment;'; then
  echo "Worksheet download route did not return an attachment." >&2
  exit 1
fi

echo "Live unauthenticated verification passed for ${BASE_URL}."
