# Open Client Signup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let anyone create a client account without an invite while preserving invite-only coach/admin setup.

**Architecture:** Client signup should call Supabase Auth without validating an invitation code and store only safe metadata. Lazy profile creation should use a new security-definer RPC that always creates `client` profiles; existing invitation acceptance remains available for privileged setup and optional client program enrollment.

**Tech Stack:** Next.js server actions, Supabase Auth, PostgreSQL RLS/functions, Vitest, shell SQL smoke tests.

---

### Task 1: Signup Action Contract

**Files:**
- Modify: `src/lib/actions.ts`
- Test: `src/lib/actions.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new RedirectError(path)
  }),
}))

it("signs up public clients without validating an invite", async () => {
  const formData = new FormData()
  formData.set("email", "client@example.com")
  formData.set("password", "password123")
  formData.set("fullName", "Open Client")

  await expect(signUpAction(formData)).rejects.toMatchObject({ path: "/onboarding" })

  expect(supabase.rpc).not.toHaveBeenCalledWith("validate_invitation", expect.anything())
  expect(supabase.auth.signUp).toHaveBeenCalledWith({
    email: "client@example.com",
    password: "password123",
    options: {
      emailRedirectTo: "http://localhost:3000/auth/callback?next=/onboarding",
      data: {
        full_name: "Open Client",
        signup_role: "client",
      },
    },
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/actions.test.ts`

Expected: FAIL because `src/lib/actions.test.ts` does not exist or `signUpAction` still calls `validate_invitation`.

- [ ] **Step 3: Write minimal implementation**

Remove the pre-signup `validate_invitation` RPC call in `signUpAction`. Send only `full_name` and `signup_role: "client"` metadata to Supabase Auth.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/actions.test.ts`

Expected: PASS for the public signup action test.

### Task 2: Open Client Profile Bootstrap

**Files:**
- Modify: `src/lib/auth.ts`
- Create: `supabase/migrations/20260701150000_open_client_signup.sql`
- Modify: `scripts/verify-supabase-sql.sh`

- [ ] **Step 1: Write the failing SQL smoke**

Add an auth user with no invitation, call `public.create_client_profile('Open Client')`, and assert the created role is `client`. Then attempt `insert into public.profiles (... role 'coach' ...)` as that same user and assert it raises.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:sql`

Expected: FAIL because `public.create_client_profile(text)` does not exist.

- [ ] **Step 3: Write minimal migration**

Create `public.create_client_profile(p_full_name text)` as `security definer`. It must require `auth.uid()` and email claim, return an existing profile when present, set `app.accepting_invitation = 'true'` only around the insert, insert `role = 'client'`, and grant execute to `authenticated`.

- [ ] **Step 4: Wire application profile creation**

In `getCurrentProfile`, replace no-profile calls to `accept_invitation_profile` with:

```ts
const inviteCode = String(user.user_metadata?.invite_code ?? "").trim()
const profileRpc = inviteCode
  ? supabase.rpc("accept_invitation_profile", {
      p_full_name: String(user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? ""),
      p_invite_code: inviteCode,
    })
  : supabase.rpc("create_client_profile", {
      p_full_name: String(user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? ""),
    })
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:sql`

Expected: PASS for both invited coach/client and open client profile creation.

### Task 3: Signup UI Copy

**Files:**
- Modify: `src/app/auth/page.tsx`

- [ ] **Step 1: Write the failing UI assertion**

Add a Vitest test that renders or inspects the auth page source and expects no required invite-code input in the signup form.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/auth/page.test.tsx`

Expected: FAIL while the invite code field is required and visible.

- [ ] **Step 3: Write minimal implementation**

Remove the invite-code field from public signup. Keep copy explicit that client signup is open and coach/admin access is controlled separately.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/auth/page.test.tsx`

Expected: PASS and the signup form contains name, email, and password only.

### Task 4: Verification

**Files:**
- Existing test and build files only.

- [ ] **Step 1: Run focused tests**

Run: `npm test -- src/lib/actions.test.ts src/app/auth/page.test.tsx src/lib/routes.test.ts src/lib/validation.test.ts`

Expected: PASS.

- [ ] **Step 2: Run SQL checks**

Run: `npm run test:sql`

Expected: PASS.

- [ ] **Step 3: Run static gates**

Run: `npm run lint`, `npm run typecheck`, and `NEXT_TELEMETRY_DISABLED=1 npm run build`.

Expected: exit 0 for each command.
