# The Healthy Way

Client and coach web app for Shahinaz El Tarouty's healthy lifestyle coaching program.

## Current Stack

- Next.js App Router
- Supabase Auth, SSR, Postgres, RLS, and migrations
- shadcn/ui components
- Vercel deployment

## Key Docs

- Deployment runbook: [docs/deployment.md](docs/deployment.md)
- Next-phase handoff: [docs/handoff-next-phase.md](docs/handoff-next-phase.md)
- Original implementation plan: [docs/superpowers/plans/2026-06-30-healthy-way-fullstack.md](docs/superpowers/plans/2026-06-30-healthy-way-fullstack.md)

## Local Gates

```bash
npm run lint
npm test -- src/lib/routes.test.ts src/lib/validation.test.ts
npm run test:sql
npm run typecheck
NEXT_TELEMETRY_DISABLED=1 npm run build
```
