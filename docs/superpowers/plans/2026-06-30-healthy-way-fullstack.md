# The Healthy Way Full-Stack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete Next.js App Router + Supabase SSR wellness coaching app for clients and one non-technical coach admin, matching the saved design references.

**Architecture:** Next.js App Router handles authenticated pages, server actions, and Supabase SSR session refresh. Supabase Postgres stores all profiles, onboarding answers, programs, schedules, recipes, workouts, goals, check-ins, resources, community posts, and coach-created content with row-level security. shadcn blocks/components provide the UI primitives and page composition.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, Supabase SSR/Auth/Postgres, Zod, React Hook Form, Vitest, Playwright, Vercel.

---

### Level 0: Scaffold, Schema, Shared App Backbone

**Files:**
- Create/modify Next.js app files under `src/app`, `src/components`, `src/lib`, `src/features`.
- Create Supabase schema and seed files under `supabase/`.
- Create tests under `src/**/*.test.ts` and Playwright tests under `e2e/`.

- [ ] Create a Next.js App Router project in the existing repository with TypeScript, Tailwind, ESLint, and `src/`.
- [ ] Initialize shadcn non-interactively with Radix primitives and install official blocks/components needed for auth, dashboard shell, forms, tables, sheets, dialogs, tabs, calendar, sonner, and charts.
- [ ] Add Supabase SSR clients, middleware, typed database helpers, server-action result helpers, and environment validation.
- [ ] Create Supabase migrations for profiles, onboarding, programs, lessons, recipes, workout templates, workout completions, live calls/events, goals, metrics, check-ins, resources/articles, community topics/posts/comments/reactions, assignments, and admin audit events.
- [ ] Seed realistic data for one coach, multiple clients, programs, recipes, workouts, live calls, resources, posts, goals, and schedules.
- [ ] Add tests for route definitions, schema type guards, action validation, and sidebar/nav coverage before production implementation code.
- [ ] Add `ideas.md` for deferred ideas so the implemented app stays simple and complete.

### Level 1: Authentication, Account Bootstrap, Onboarding

**Routes:**
- `/auth`
- `/auth/callback`
- `/onboarding`
- `/dashboard`

- [ ] Build the shadcn login/signup screen using the generated welcome/auth reference as visual target.
- [ ] Implement email/password signup, email/password login, magic-link request, password reset request, sign out, and auth callback handling with Supabase SSR.
- [ ] Create profile bootstrap so a new auth user always gets a `profiles` row and role.
- [ ] Build onboarding with name, primary goal, food relationship support, fitness level, dietary preferences, availability, disclaimer acknowledgement, and program choice.
- [ ] Persist onboarding answers and route incomplete clients back to onboarding until complete.
- [ ] Test auth form validation, onboarding validation, profile bootstrap logic, and protected-route redirects.

### Level 2: Client Dashboard

**Routes:**
- `/dashboard`

- [ ] Build a responsive shadcn sidebar shell with account menu, profile link, settings link, sign out, and mobile sheet navigation.
- [ ] Build dashboard weekly strip, clickable day selection, today agenda, progress summary, streaks, live-call join actions, workout/recipe/detail navigation, and check-in entry.
- [ ] Verify every dashboard action: previous/next week, Today, select day, View Workout, View Meal Plan, Join Call, Start Check-in, View full day, card overflow, profile menu, settings, sign out.

### Level 3: Client Pages, One Page at a Time

**Routes:**
- `/programs`
- `/recipes`
- `/workouts`
- `/live-calls`
- `/goals`
- `/community`
- `/resources`

- [ ] Build programs page with enrolled program progress, modules, lessons, milestones, and linked workouts/recipes.
- [ ] Verify every Programs action: tabs, expand week, Next Lesson, view lesson, view linked recipe, view linked workout, enroll/switch where allowed.
- [ ] Build recipes page with filters, favorites, meal-plan add/remove, shopping-list generation, and recipe detail sheet.
- [ ] Verify every Recipes action: search, filters, sort, favorite/save, open detail, close detail, tabs, Add to Meal Plan, Add to Shopping List, View Meal Plan, shopping list.
- [ ] Build workouts page with weekly schedule, workout detail, exercise completion, effort rating, coach notes, and completion persistence.
- [ ] Verify every Workouts action: select scheduled workout, filter library, view workout, play/open video, mark exercise, complete workout, save effort, send notes.
- [ ] Build live calls page with RSVP, reminder preferences, join link, add-to-calendar file download, agenda, and replay/resources list.
- [ ] Verify every Live Calls action: calendar/list toggle, month navigation, Join Call, Add to Calendar, Update RSVP, reminder toggle/config, replay, resource download.
- [ ] Build goals/progress page with goal CRUD, metric entries, habit tracking, check-in history, and coach feedback.
- [ ] Verify every Goals action: edit goal, save goal, habit toggle, metric entry, date range nav, send message to coach.
- [ ] Build community with topics, new post composer, comments, reactions, moderation/report action, and pinned coach announcement.
- [ ] Verify every Community action: topic tabs, New Post, Post, add tag, add image, react, reply, report, open guidelines.
- [ ] Build resources/articles page with searchable articles/downloads and read/save tracking.
- [ ] Verify every Resources action: search, filter, open/read, download, save, mark complete.
- [ ] Add route/action tests and Playwright coverage for every visible primary action.

### Level 4: User Profile, Settings, Messages

**Routes:**
- `/messages`
- `/settings`
- `/profile`

- [ ] Build messages inbox/thread UI backed by seeded message data and send-message server action.
- [ ] Build profile page for name, avatar URL, timezone, dietary/fitness preferences, availability, coach/program status, and save behavior.
- [ ] Build settings page for notification preferences, password reset request, account safety, and sign out.
- [ ] Verify every User action: select conversation, send message, save profile, save notification settings, request reset email, account menu routes, sign out.

### Level 5: Coach Admin

**Routes:**
- `/admin`
- `/admin/clients`
- `/admin/content`
- `/admin/schedule`
- `/admin/check-ins`
- `/admin/community`
- `/admin/settings`

- [ ] Protect admin routes by role and redirect non-coaches.
- [ ] Build coach dashboard with client roster, pending check-ins, weekly schedule, content manager, and quick-add buttons.
- [ ] Build CRUD sheets for workouts, recipes, live calls, resources/articles, goals, metrics, programs, lessons, and community announcements.
- [ ] Make coach forms non-technical: repeatable ingredient/exercise/agenda builders, assign-to-program/client controls, preview panels, validation, save/publish states, duplicate actions, and archive actions.
- [ ] Build client profile admin view with onboarding answers, progress, assigned content, notes, messages, and manual assignment tools.
- [ ] Record admin audit events for create/update/archive/assign actions.
- [ ] Verify every Admin action: Add Workout, Add Recipe, Add Live Call, Add Resource, Add Goal, Add Program, Add Client, Edit, Duplicate, Preview, Archive, Assign, schedule plus button, check-in reply, community pin/hide.
- [ ] Add tests for role protection, CRUD validation, assignment behavior, and audit logging.

### Level 6: Verification and Deployment

- [ ] Run typecheck, lint, unit tests, build, and Playwright.
- [x] Run verifier agents and static sweeps against the app for dead buttons, missing pages, inaccessible settings/profile/account sections, and production-only UI.
- [ ] Start local dev server and inspect desktop/mobile screenshots.
- [ ] Run Supabase local migration/seed when Docker is available; otherwise verify SQL syntax and document required hosted-project commands.
- [ ] Deploy with Vercel tooling if project authentication and required Supabase environment variables are available.
- [ ] If deployment cannot be completed due to missing external project secrets, leave a deploy-ready app with exact required environment variables and commands.
