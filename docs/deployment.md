# Deployment Runbook

This app is intended to run as a Supabase-backed Next.js app on Vercel.

## Current Supabase State

- Supabase organization created: `The Healthy Way`
- Organization ID: `ramelxmnevkavjibdroo`
- Supabase project: `the-healthy-way`
- Project ref: `akqeidmgwrtvgkwwglqn`
- Region: `us-west-1`
- Dashboard: `https://supabase.com/dashboard/project/akqeidmgwrtvgkwwglqn`

## Required Environment

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_APP_URL=https://<vercel-production-domain>
```

`COACH_EMAIL` is optional. When it is provided, the initial coach invitation is locked to
that email. When it is omitted, the deployment script creates a one-use coach invite code
that can be accepted by the first signed-in email that uses it.

## Supabase

For a new project:

```bash
SUPABASE_ORG_ID=ramelxmnevkavjibdroo \
scripts/deploy-supabase.sh
```

The script will:

- create the Supabase project if `SUPABASE_PROJECT_REF` is not provided
- link the local repo to the project
- push migrations and seed data
- create a one-time coach invitation
- write `.env.local` with the project URL, anon key, and `NEXT_PUBLIC_APP_URL`

Use the printed coach invite code once on `/auth` when creating the coach account. Client
accounts should be invited from the coach admin panel so they receive client-role invite
codes tied to the coach and starter program.

Note: this is the current deployed auth model, not the intended next product model. The
next phase should allow open client signup, keep coach/admin creation privileged, and use
codes only to unlock specific programs, packages, or entitlements. See
`docs/handoff-next-phase.md`.

If a project already exists, run:

```bash
SUPABASE_PROJECT_REF=<project-ref> \
scripts/deploy-supabase.sh
```

Set `SUPABASE_DB_PASSWORD` only when the CLI requires it for link or push. If the workspace
is already linked, the script can push via the Supabase CLI session without the database
password.

## Supabase Auth URLs

After Vercel deployment, set these in the Supabase dashboard:

- Site URL: `https://<vercel-production-domain>`
- Redirect URL: `https://<vercel-production-domain>/auth/callback`

## Vercel

Update `.env.local` so `NEXT_PUBLIC_APP_URL` is the production Vercel domain, then run:

```bash
scripts/configure-vercel-env.sh
vercel --prod
```

`scripts/configure-vercel-env.sh` refuses to push `http://localhost:*`,
`http://127.0.0.1:*`, or a non-HTTPS app URL to Vercel. This prevents Supabase
auth emails from redirecting production users back to a local development URL.

## Verification

Local gates:

```bash
npm run lint
npm test -- src/lib/routes.test.ts src/lib/validation.test.ts
npm run test:sql
npm run typecheck
NEXT_TELEMETRY_DISABLED=1 npm run build
```

Live smoke:

```bash
scripts/verify-live.sh https://<vercel-production-domain>
```

Do not consider deployment complete until the live smoke check passes against the Vercel URL and Supabase auth redirects are configured.
