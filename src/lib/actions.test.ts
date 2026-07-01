import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const redirect = vi.fn((path: string) => {
    const error = new Error(`Redirected to ${path}`) as Error & { path: string }
    error.path = path
    throw error
  })

  return {
    redirect,
    revalidatePath: vi.fn(),
    supabase: {
      rpc: vi.fn(),
      auth: {
        signUp: vi.fn(),
      },
    },
  }
})

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}))

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}))

vi.mock("./supabase/server", () => ({
  createClient: vi.fn(async () => mocks.supabase),
}))

import { signUpAction } from "./actions"

function signupForm(overrides: Record<string, string> = {}) {
  const formData = new FormData()
  formData.set("email", overrides.email ?? "client@example.com")
  formData.set("password", overrides.password ?? "password123")
  formData.set("fullName", overrides.fullName ?? "Open Client")

  for (const [key, value] of Object.entries(overrides)) {
    formData.set(key, value)
  }

  return formData
}

describe("signUpAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.supabase.rpc.mockResolvedValue({ error: null })
    mocks.supabase.auth.signUp.mockResolvedValue({ error: null })
  })

  it("signs up public clients without validating an invitation", async () => {
    await expect(signUpAction(signupForm())).rejects.toMatchObject({
      path: "/onboarding",
    })

    expect(mocks.supabase.rpc).not.toHaveBeenCalledWith(
      "validate_invitation",
      expect.anything()
    )
    expect(mocks.supabase.auth.signUp).toHaveBeenCalledWith({
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

  it("does not forward privileged role requests from public signup", async () => {
    await expect(
      signUpAction(signupForm({ role: "admin", inviteCode: "HW-ADMIN" }))
    ).rejects.toMatchObject({ path: "/onboarding" })

    expect(mocks.supabase.auth.signUp.mock.calls[0]?.[0]).toMatchObject({
      options: {
        data: {
          full_name: "Open Client",
          signup_role: "client",
        },
      },
    })
  })
})
