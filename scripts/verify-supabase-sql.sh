#!/usr/bin/env bash
set -euo pipefail

if ! command -v initdb >/dev/null 2>&1 || ! command -v postgres >/dev/null 2>&1 || ! command -v psql >/dev/null 2>&1; then
  echo "Postgres CLI tools are required: initdb, postgres, and psql." >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMPDIR_PG="$(mktemp -d /tmp/healthy-way-pg.XXXXXX)"
PGDATA="${TMPDIR_PG}/data"
LOG="${TMPDIR_PG}/postgres.log"
PORT="${POSTGRES_VERIFY_PORT:-55432}"

while lsof -iTCP:"${PORT}" -sTCP:LISTEN >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done

cleanup() {
  if [[ -n "${POSTGRES_PID:-}" ]]; then
    kill "${POSTGRES_PID}" >/dev/null 2>&1 || true
  fi
  rm -rf "${TMPDIR_PG}"
}
trap cleanup EXIT

initdb -D "${PGDATA}" --no-locale --encoding=UTF8 >/dev/null
postgres -D "${PGDATA}" -p "${PORT}" -k "${TMPDIR_PG}" > "${LOG}" 2>&1 &
POSTGRES_PID=$!

for _ in {1..60}; do
  if pg_isready -h "${TMPDIR_PG}" -p "${PORT}" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

createdb -h "${TMPDIR_PG}" -p "${PORT}" healthy_way_sqlcheck

cat > "${TMPDIR_PG}/prelude.sql" <<'SQL'
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
end $$;

create schema if not exists auth;

create table auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create or replace function auth.jwt()
returns jsonb
language sql
stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
$$;
SQL

psql -v ON_ERROR_STOP=1 -h "${TMPDIR_PG}" -p "${PORT}" -d healthy_way_sqlcheck -f "${TMPDIR_PG}/prelude.sql" >/dev/null

for file in "${ROOT_DIR}"/supabase/migrations/*.sql "${ROOT_DIR}"/supabase/seed.sql; do
  echo "Applying ${file#${ROOT_DIR}/}"
  psql -v ON_ERROR_STOP=1 -h "${TMPDIR_PG}" -p "${PORT}" -d healthy_way_sqlcheck -f "${file}" >/dev/null
done

cat > "${TMPDIR_PG}/auth-smoke.sql" <<'SQL'
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'coach@example.com'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'client@example.com');

insert into public.invitations (code, email, role, expires_at)
values ('HW-COACH-SMOKE', 'coach@example.com', 'coach', now() + interval '30 days');

select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', false);
select set_config('request.jwt.claims', '{"email":"coach@example.com"}', false);
select (public.accept_invitation_profile('Smoke Coach', 'HW-COACH-SMOKE')).role;

insert into public.invitations (code, email, coach_id, role, program_id, expires_at)
values (
  'HW-CLIENT-SMOKE',
  'client@example.com',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'client',
  '10000000-0000-0000-0000-000000000001',
  now() + interval '30 days'
);

select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000001', false);
select set_config('request.jwt.claims', '{"email":"client@example.com"}', false);
select (public.accept_invitation_profile('Smoke Client', 'HW-CLIENT-SMOKE')).role;

do $$
declare
  v_profiles integer;
  v_coach_clients integer;
  v_enrollments integer;
begin
  select count(*) into v_profiles
  from public.profiles
  where id in (
    'aaaaaaaa-0000-0000-0000-000000000001',
    'bbbbbbbb-0000-0000-0000-000000000001'
  );

  select count(*) into v_coach_clients
  from public.coach_clients
  where coach_id = 'aaaaaaaa-0000-0000-0000-000000000001'
    and client_id = 'bbbbbbbb-0000-0000-0000-000000000001';

  select count(*) into v_enrollments
  from public.program_enrollments
  where client_id = 'bbbbbbbb-0000-0000-0000-000000000001'
    and program_id = '10000000-0000-0000-0000-000000000001';

  if v_profiles <> 2 or v_coach_clients <> 1 or v_enrollments <> 1 then
    raise exception 'Auth smoke failed: profiles %, coach_clients %, enrollments %',
      v_profiles, v_coach_clients, v_enrollments;
  end if;
end $$;
SQL

psql -v ON_ERROR_STOP=1 -h "${TMPDIR_PG}" -p "${PORT}" -d healthy_way_sqlcheck -f "${TMPDIR_PG}/auth-smoke.sql" >/dev/null

psql -v ON_ERROR_STOP=1 -h "${TMPDIR_PG}" -p "${PORT}" -d healthy_way_sqlcheck -Atc "
  select label || '=' || count from (
    select 'programs' as label, count(*)::text as count from public.programs
    union all select 'recipes', count(*)::text from public.recipes
    union all select 'workouts', count(*)::text from public.workouts
    union all select 'events', count(*)::text from public.calendar_events
    union all select 'goals', count(*)::text from public.goals
  ) counts;
"

echo "Supabase SQL migration, seed, and auth bootstrap smoke passed."
