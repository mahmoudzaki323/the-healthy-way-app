import { redirect } from "next/navigation"

import type { Profile } from "./types"
import { createClient } from "./supabase/server"

function mapProfile(row: {
  id: string
  email: string
  full_name: string
  role: "client" | "coach" | "admin"
  avatar_url: string | null
  timezone: string
  bio: string | null
  dietary_preferences: string[]
  availability: string | null
  notification_preferences?: {
    email?: boolean
    sms?: boolean
    push?: boolean
    calls?: boolean
    community?: boolean
    defaultProgramId?: string
  } | null
}): Profile {
  const notificationPreferences = row.notification_preferences ?? {}

  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    avatarUrl: row.avatar_url ?? undefined,
    timezone: row.timezone,
    bio: row.bio ?? undefined,
    dietaryPreferences: row.dietary_preferences,
    availability: row.availability ?? "",
    notificationPreferences: {
      email: notificationPreferences.email ?? true,
      sms: notificationPreferences.sms ?? false,
      push: notificationPreferences.push ?? false,
      calls: notificationPreferences.calls ?? true,
      community: notificationPreferences.community ?? true,
      defaultProgramId: notificationPreferences.defaultProgramId,
    },
  }
}

function enforceRoleHint(profile: Profile, roleHint: "client" | "coach") {
  if (roleHint === "client" && (profile.role === "coach" || profile.role === "admin")) {
    redirect("/admin")
  }

  if (roleHint === "coach" && profile.role === "client") {
    redirect("/dashboard")
  }

  return profile
}

export async function getCurrentProfile(
  roleHint: "client" | "coach" = "client",
  options: { allowIncompleteOnboarding?: boolean } = {}
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    throw new Error(profileError.message)
  }

  const inviteCode = String(user.user_metadata?.invite_code ?? "").trim()

  if (!profile) {
    const { data: createdProfile, error } = await supabase.rpc(
      "accept_invitation_profile",
      {
        p_full_name: String(
          user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? ""
        ),
        p_invite_code: inviteCode,
      }
    )

    if (error || !createdProfile) {
      throw new Error(error?.message ?? "Unable to create profile")
    }

    const mappedProfile = enforceRoleHint(mapProfile(createdProfile), roleHint)

    if (
      roleHint === "client"
      && mappedProfile.role === "client"
      && !options.allowIncompleteOnboarding
    ) {
      redirect("/onboarding")
    }

    return mappedProfile
  }

  const mappedProfile = enforceRoleHint(mapProfile(profile), roleHint)

  if (
    roleHint === "client"
    && mappedProfile.role === "client"
    && !options.allowIncompleteOnboarding
  ) {
    const { data: intake, error: intakeError } = await supabase
      .from("client_intakes")
      .select("id")
      .eq("client_id", mappedProfile.id)
      .maybeSingle()

    if (intakeError) {
      throw new Error(intakeError.message)
    }

    if (!intake) {
      redirect("/onboarding")
    }
  }

  return mappedProfile
}

export async function requireCoachProfile() {
  const profile = await getCurrentProfile("coach")

  if (profile.role !== "coach" && profile.role !== "admin") {
    redirect("/dashboard")
  }

  return profile
}
