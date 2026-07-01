# The Healthy Way Next-Phase Handoff

Date: 2026-07-01

## Executive Summary

The current app is a working Supabase-backed Next.js/Vercel build with client pages, coach/admin pages, auth, onboarding, content creation, assignments, messaging, check-ins, recipes, workouts, community, and live-call scheduling. It has been deployed and smoke-tested.

The next phase should not add isolated fixes one at a time. The product model needs to move from invite-first coaching access to open client signup plus paid/free access controls for programs, recipe collections, workouts, packages, and subscription tiers. Admin authoring also needs to become genuinely variable and reusable, especially for recipes, where the database is already normalized but the current admin quick-add UI still hard-codes a small number of inputs.

Do not treat the current invite-only client signup as the desired final model.

## Current Production State

- Supabase project: `the-healthy-way`
- Supabase project ref: `akqeidmgwrtvgkwwglqn`
- Supabase organization: `The Healthy Way`
- Vercel project: `the-healthy-way`
- Production URL: `https://the-healthy-way.vercel.app`
- GitHub repository: `https://github.com/mahmoudzaki323/the-healthy-way-app`
- Current local branch before this handoff was written: `codex/healthy-way-fullstack`
- Target branch for production work: `main`

Do not commit `.env.local`, Supabase service-role keys, database passwords, or any Vercel/Supabase secrets. The public anon key and public project URL belong in environment variables only.

## What Is Already Built

- Supabase schema and RLS migrations for profiles, invitations, coach-client links, intakes, programs, lessons, recipe ingredients and steps, workouts, live calls, resources, goals, calendar events, community, messages, check-ins, and assignments.
- Supabase SSR auth flow with email confirmation support, password reset, magic link, callback routing, onboarding redirect, and role-based admin/client routing.
- Client app pages:
  - Dashboard
  - Onboarding
  - Programs
  - Recipes
  - Workouts
  - Live calls
  - Goals
  - Community
  - Messages
  - Profile
  - Settings
  - Resources
- Coach/admin pages:
  - Admin dashboard
  - Content manager
  - Schedule
  - Clients
  - Check-ins
  - Messages
  - Community moderation
  - Admin settings
- Admin actions for creating, assigning, duplicating, archiving, and updating major content types.
- Review-agent fixes already landed for signup invite validation timing, onboarding redirect, check-in scoping, coach conversation startup, lesson completion, workout planner truthfulness, schedule assignment, and deployment script safety.

## Known Product Mismatches To Fix Next

1. Client signup is currently invite-code based.
   - New direction: anyone can create a client account.
   - Access codes should be used only to join a specific private program/package, not to create a basic account.
   - Coach/admin account creation should remain controlled through seeds, admin-only invites, or privileged setup flows.

2. Access is not yet monetized or entitlement-based.
   - New direction: some programs, recipe books, recipe folders, workouts, live-call series, and packages can be free; others require subscription tier, one-time purchase, bundle purchase, or access code.
   - Stripe should own payments and checkout.
   - Supabase should own resulting entitlements and RLS/access decisions.

3. Admin authoring still has hard-coded quick-add patterns.
   - Recipes are the clearest example: database tables support variable ingredients and steps, but `src/components/admin-quick-add.tsx` renders fixed default inputs.
   - The same audit should be applied to workouts, programs, lessons, resources, goals, and schedules.

4. Roles need clearer separation.
   - `admin`: tactical advisor/platform owner with full visibility and account management.
   - `coach`: Shahinaz or another coach with content/client management.
   - `client`: open signup user with entitlements controlling paid/free access.
   - The existing `coach` and `admin` roles are present in the enum; the admin creation and operational UX need a first-class setup path.

5. Vercel project deployment should be Git-backed.
   - The app was deployed successfully from the CLI.
   - The Vercel project must be connected to the GitHub repository so future production deploys come from `main`, not from a local package upload.
   - If "Redis" in the request meant a separate cache/session service, there is currently no Redis dependency in the app. If Redis is wanted later, use a managed provider such as Upstash and add it deliberately.

## Target Access Model

Use this as the next architecture target:

- Open account creation:
  - Sign up creates a `client` profile without invite validation.
  - Onboarding asks goals, food relationship support, fitness level, preferences, schedule, health disclaimer, and optional starter free program.
  - Email confirmation remains enabled.

- Restricted privileged accounts:
  - Admin and coach creation requires an admin-only invite, seed script, or Supabase-admin procedure.
  - Keep one seeded tactical advisor admin path.
  - Allow the coach to create her own admin/coach account using a privileged setup invite.
  - Do not let public signup choose `admin` or `coach`.

- Free content:
  - Published content can be marked `free`.
  - Free programs/recipes/workouts/resources are visible to any onboarded client.

- Paid content:
  - Published content can require one or more entitlements.
  - Entitlements can come from Stripe subscription tier, one-time product purchase, bundle purchase, manual admin grant, or access code redemption.

- Access codes:
  - Codes should grant a specific entitlement, program enrollment, package, or subscription trial.
  - Codes should not be mandatory for public account creation.

## Suggested Supabase Schema Changes

Add a new migration rather than modifying existing migrations:

- `products`
  - `id`
  - `name`
  - `description`
  - `product_type`: `program`, `recipe_collection`, `workout_collection`, `bundle`, `subscription`, `live_call_series`, `resource_collection`
  - `status`
  - `free_access`
  - `stripe_product_id`
  - `created_by`

- `prices`
  - `id`
  - `product_id`
  - `stripe_price_id`
  - `billing_type`: `free`, `one_time`, `subscription`
  - `amount_cents`
  - `currency`
  - `interval`
  - `active`

- `entitlements`
  - `id`
  - `key`
  - `name`
  - `description`

- `product_entitlements`
  - `product_id`
  - `entitlement_id`

- `content_entitlements`
  - `entity_type`
  - `entity_id`
  - `entitlement_id`
  - `access_mode`: `required`, `included`

- `client_entitlements`
  - `client_id`
  - `entitlement_id`
  - `source`: `stripe_subscription`, `stripe_checkout`, `admin_grant`, `access_code`, `free`
  - `source_id`
  - `starts_at`
  - `ends_at`
  - `status`

- `access_codes`
  - `code`
  - `entitlement_id`
  - `product_id`
  - `max_redemptions`
  - `redeemed_count`
  - `expires_at`
  - `status`

- `recipe_collections`
  - `id`
  - `title`
  - `description`
  - `status`
  - `free_access`
  - `sort_order`

- `recipe_collection_items`
  - `collection_id`
  - `recipe_id`
  - `sort_order`

Consider equivalent collection tables for workouts/resources if the UX calls for folders and subfolders:

- `content_collections`
- `content_collection_items`

This generic option avoids building separate folder systems for each content type.

## RLS Direction

Create helper functions:

- `public.client_has_entitlement(p_client_id uuid, p_entitlement_id uuid)`
- `public.client_can_access_entity(p_client_id uuid, p_entity_type text, p_entity_id uuid)`
- `public.current_user_can_manage_content()`

Client read policies should allow content when:

- content is published and marked free, or
- content has no entitlement requirements, or
- the client has a matching active entitlement, or
- the client is directly assigned the item, or
- the client is enrolled in a program that includes the item.

Admin/coach policies should remain broad enough for management, but coach visibility should remain scoped if future multi-coach support becomes real.

## Stripe Integration Plan

Use Stripe Checkout first; do not build a custom payment form.

Required routes/actions:

- `POST /api/stripe/checkout`
  - Accepts product/price ID.
  - Requires signed-in user.
  - Creates Stripe Checkout session.
  - Includes Supabase user ID and product ID in metadata.

- `POST /api/stripe/webhook`
  - Verifies Stripe signature.
  - Handles `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, and payment failures.
  - Upserts `client_entitlements`.
  - Never trusts client-submitted entitlement data.

Required environment variables:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

Keep product and price metadata synchronized with Supabase. Stripe is payment truth; Supabase is app-access truth.

## Admin UX Changes

### Recipes

Replace the current fixed quick-add recipe fields with a full recipe builder:

- Add ingredient button.
- Remove ingredient button.
- Reorder ingredients.
- Ingredient fields:
  - ingredient name
  - quantity
  - unit
  - preparation note
  - optional section label, such as "Dressing" or "Bowl"
- Add step button.
- Remove step button.
- Reorder steps.
- Step fields:
  - instruction
  - optional timer
  - optional media URL
- Nutrition fields remain optional.
- Tags should be editable chips rather than fixed assumptions.
- Preview panel should render the consumer-facing recipe card before publishing.

Backend adjustment:

- Current `recipe_ingredients` has `label` and `quantity`. Add `unit`, `note`, and `section`.
- Keep a compatibility read path so old rows still render.

### Programs

Build a program builder instead of only title/duration:

- Add/remove/reorder weeks.
- Add/remove/reorder lessons inside weeks.
- Attach workouts, recipes, resources, live calls, and goals to weeks.
- Configure whether each week unlocks immediately, by date, by prior completion, or manually.
- Configure access: free, entitlement-required, access-code-required, or direct assignment.

### Workouts

Workout builder should support:

- Add/remove/reorder exercises.
- Exercise library reuse.
- Sets, reps, time, rest, tempo, notes, equipment, and substitutions.
- Optional video per workout and per exercise.
- Preview client workout card.

### Content Collections

Add admin folders/collections for:

- Recipe books
- Workout packs
- Resource folders
- Program packages

Each collection needs:

- title
- description
- cover image
- free/paid setting
- entitlement requirement
- included content list
- sort order
- publish status

### Access Management

Admin panel should include:

- Products/packages screen.
- Stripe price linking screen.
- Access code generation.
- Manual grant/revoke entitlement for a client.
- Client access audit tab showing how each client got access.

## Client UX Changes

### Public-To-App Flow

- Public signup should be accessible without an invite code.
- After onboarding, clients land on dashboard with free content visible.
- Paid content appears locked with clear CTAs:
  - Join free program
  - Unlock with access code
  - Buy package
  - Subscribe

### Programs

- Show free programs as joinable.
- Show paid programs as locked until entitlement exists.
- Access-code redemption should unlock only the intended program/package.

### Recipes

- Show recipe collections/books.
- Free recipes should be browseable.
- Paid recipes should show locked preview cards unless user has access.
- Consumer recipe view should render variable ingredient sections cleanly.

### Dashboard

- Calendar should continue showing assigned workouts/live calls/check-ins.
- Add entitlements-aware "Available to you" modules.
- Do not surface paid locked items as if they are assigned tasks.

## Implementation Levels

### Level 1: Repository and Deployment Hygiene

Acceptance criteria:

- `main` contains the current app and this handoff.
- GitHub repository is the source of truth.
- Vercel project is connected to GitHub and deploys from `main`.
- Vercel env vars are still configured.
- Supabase migrations remain in sync with remote.
- Local gates pass.

Commands:

```bash
npm run lint
npm test -- src/lib/routes.test.ts src/lib/validation.test.ts
npm run test:sql
npm run typecheck
NEXT_TELEMETRY_DISABLED=1 npm run build
scripts/verify-live.sh https://the-healthy-way.vercel.app
```

### Level 2: Open Signup and Privileged Account Setup

Acceptance criteria:

- Client signup no longer requires invite code.
- Onboarding still required before client app access.
- Coach/admin signup still requires privileged invite or seed.
- Tactical advisor admin can be seeded.
- Coach can create her own admin/coach account through a controlled setup code.
- Tests prove public users cannot self-assign privileged roles.

Files likely touched:

- `src/lib/actions.ts`
- `src/lib/auth.ts`
- `src/app/auth/page.tsx`
- `src/app/signup/page.tsx`
- `src/app/onboarding/page.tsx`
- New Supabase migration replacing client invite assumptions.

### Level 3: Entitlements and Access Codes

Acceptance criteria:

- Free content works for all onboarded clients.
- Access codes grant specific product/program/package access.
- Direct assignment remains possible.
- RLS prevents access to paid content without entitlement.
- Admin can grant/revoke access manually.

Files likely touched:

- New entitlement migration.
- `src/lib/data.ts`
- `src/lib/actions.ts`
- Admin access-management pages.
- Client content pages.

### Level 4: Stripe Payments

Acceptance criteria:

- Admin can link products/packages to Stripe prices.
- Client can buy a package or subscribe.
- Stripe webhook grants/revokes entitlements.
- App behavior remains correct if webhook is retried.
- Failed/canceled subscription removes paid access without deleting user data.

Files likely touched:

- New `/api/stripe/checkout` route.
- New `/api/stripe/webhook` route.
- Product/package admin pages.
- Vercel environment variables.

### Level 5: Variable Admin Builders

Acceptance criteria:

- Recipe builder supports any number of ingredients and steps.
- Workout builder supports any number of exercises.
- Program builder supports any number of weeks and lessons.
- Collection builder supports any number of included items.
- Admin preview matches client-facing card/detail rendering.
- No fixed sample/default items are required to create real content.

Files likely touched:

- `src/components/admin-quick-add.tsx` should likely be split into dedicated builders.
- `src/app/admin/content/page.tsx`
- `src/lib/validation.ts`
- `src/lib/actions.ts`
- `src/lib/data.ts`
- New client components for dynamic field arrays.

### Level 6: Full QA Pass

Acceptance criteria:

- Public visitor can sign up as a client without code.
- Client can complete onboarding.
- Client can access free program.
- Client cannot access paid program without entitlement.
- Client can redeem valid access code.
- Client can purchase package through Stripe test mode.
- Client sees newly unlocked recipes/workouts/programs.
- Coach/admin can create variable recipe with 1 ingredient and with 20 ingredients.
- Coach/admin can create variable program with multiple weeks/lessons.
- Admin can seed/manage coach and tactical advisor accounts.
- Existing dashboard/calendar/messages/check-ins still work.
- Vercel deployment from `main` succeeds.

## Tests To Add

- Unit tests for `validate_invitation` replacement/open signup behavior.
- SQL tests for entitlement helper functions and RLS.
- Server-action tests for:
  - signup without invite
  - privileged invite required for coach/admin
  - access code redemption
  - manual grant/revoke
  - recipe builder payload parsing
- Playwright tests for:
  - signup/onboarding
  - locked paid program
  - free program enrollment
  - Stripe test checkout redirect
  - variable recipe creation
  - recipe client rendering
  - admin access grant

## Areas To Audit For Hard-Coding

- Fixed recipe ingredients and steps in `src/components/admin-quick-add.tsx`.
- Fixed workout exercise defaults in `src/components/admin-quick-add.tsx`.
- Fixed live-call agenda defaults in `src/components/admin-quick-add.tsx`.
- Fixed recipe filters in `src/app/recipes/page.tsx`.
- Any content type whose admin form does not support add/remove/reorder.
- Any client page that assumes all published content is available.
- Any data query that does not check direct assignment, free access, or entitlement.

## Recommended Agent Split

- Auth/access agent:
  - Open signup, privileged admin/coach setup, role safety tests.

- Entitlements/Stripe agent:
  - Product tables, Stripe routes, webhook idempotency, RLS helper functions.

- Admin builder UX agent:
  - Recipe/workout/program/collection dynamic authoring components.

- Client UX agent:
  - Locked/free states, access-code redemption, recipe collection and program storefront views.

- QA/security agent:
  - RLS tests, Playwright flows, privilege-escalation checks, deployment smoke.

Each agent should produce a concrete diff and a verification log. No agent should leave nonfunctional CTAs, placeholder buttons, or optimistic UI without a real backend action.

## Definition Of Done For The Next Phase

- Open client signup is live.
- Coach/admin setup is controlled and documented.
- Stripe test-mode purchase grants access through webhooks.
- Free and paid content are enforced by Supabase, not just hidden in the UI.
- Admin can create realistic variable content without editing code.
- Client-facing content renders polished variable recipes/programs/workouts.
- All local gates and live smoke pass.
- Vercel is GitHub-connected and production deploys from `main`.
