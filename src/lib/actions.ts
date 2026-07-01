"use server"

import { randomBytes } from "node:crypto"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { appUrl, requireSupabaseEnv } from "./env"
import {
  adminGoalSchema,
  adminLiveCallSchema,
  adminProgramSchema,
  adminRecipeSchema,
  adminResourceSchema,
  adminScheduleSchema,
  adminSettingsSchema,
  adminWorkoutSchema,
  checkInSchema,
  communityPostSchema,
  metricEntrySchema,
  messageSchema,
  onboardingSchema,
  profileSchema,
} from "./validation"
import { getCurrentProfile, requireCoachProfile } from "./auth"
import { createClient } from "./supabase/server"

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim()
}

function getArray(formData: FormData, key: string) {
  return formData.getAll(key).map(String).filter(Boolean)
}

function getBool(formData: FormData, key: string) {
  return formData.getAll(key).some((value) => value === "on" || value === "true")
}

function getStatus(formData: FormData) {
  const intent = getString(formData, "intent")
  if (intent === "draft" || intent === "preview") return "draft"

  return getString(formData, "status") || "published"
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
}

function formMetadata(formData: FormData) {
  return Object.fromEntries(
    Array.from(formData.entries()).map(([key, value]) => [key, String(value)])
  )
}

function addMinutes(value: string, minutes: number) {
  const date = new Date(value)
  date.setMinutes(date.getMinutes() + minutes)
  return date.toISOString()
}

function normalizeContentType(value: string) {
  return value.toLowerCase().replace(/[\s_-]+/g, "")
}

function parseTargetSelection(value: string) {
  if (!value || value === "all_clients") {
    return { targetType: "all_clients", targetId: null }
  }

  if (value.startsWith("program:")) {
    const targetId = value.slice("program:".length)
    if (targetId) return { targetType: "program", targetId }
  }

  if (value.startsWith("client:")) {
    const targetId = value.slice("client:".length)
    if (targetId) return { targetType: "client", targetId }
  }

  throw new Error("Choose a valid audience before saving the schedule item.")
}

function parseContentSelection(value: string) {
  if (!value || value === "none") return null

  const [rawType, id] = value.split(":")
  if (!rawType || !id) {
    throw new Error("Choose a valid content item.")
  }

  const normalized = normalizeContentType(rawType)
  const itemType = normalized === "livecall" ? "live_call" : normalized
  const entityType =
    itemType === "live_call"
      ? "Live Call"
      : itemType === "workout"
        ? "Workout"
        : itemType === "recipe"
          ? "Recipe"
          : itemType === "resource"
            ? "Resource"
            : itemType === "program"
              ? "Program"
              : itemType === "goal"
                ? "Goal"
                : rawType

  return { entityType, entityId: id, itemType }
}

type AssignableSource = {
  title: string
  description: string
  status: string
  callUrl?: string | null
  eventType?: "workout" | "meal" | "live_call" | "check_in" | "resource" | "custom"
  itemType?: string | null
  itemId?: string | null
}

function redirectWithPath(path: string) {
  revalidatePath(path)
  redirect(path)
}

function requireSupabaseForWrite() {
  requireSupabaseEnv()
  return true
}

async function mustWrite<T extends { error: { message: string } | null }>(
  operation: PromiseLike<T>
) {
  const result = await operation

  if (result.error) {
    throw new Error(result.error.message)
  }

  return result
}

function requireRow<T>(row: T | null, message: string): T {
  if (!row) {
    throw new Error(message)
  }

  return row
}

export async function signInAction(formData: FormData) {
  const email = getString(formData, "email")
  const password = getString(formData, "password")

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) redirect(`/auth?error=${encodeURIComponent(error.message)}`)

  if (data.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle()

    if (profile?.role === "coach" || profile?.role === "admin") {
      redirect("/admin")
    }
  }

  redirect("/dashboard")
}

export async function signUpAction(formData: FormData) {
  const email = getString(formData, "email")
  const password = getString(formData, "password")
  const fullName = getString(formData, "fullName")

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback?next=/onboarding`,
      data: {
        full_name: fullName,
        signup_role: "client",
      },
    },
  })
  if (error) redirect(`/auth?error=${encodeURIComponent(error.message)}`)

  redirect("/onboarding")
}

export async function magicLinkAction(formData: FormData) {
  const email = getString(formData, "email")

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${appUrl}/auth/callback` },
  })
  if (error) redirect(`/auth?error=${encodeURIComponent(error.message)}`)

  redirect("/auth?sent=magic-link")
}

export async function passwordResetAction(formData: FormData) {
  const email = getString(formData, "email")

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=/auth/update-password`,
  })
  if (error) redirect(`/auth?error=${encodeURIComponent(error.message)}`)

  redirect("/auth?sent=password-reset")
}

export async function updatePasswordAction(formData: FormData) {
  const password = getString(formData, "password")
  const confirmPassword = getString(formData, "confirmPassword")

  if (password.length < 8) {
    redirect("/auth/update-password?error=Password%20must%20be%20at%20least%208%20characters")
  }

  if (password !== confirmPassword) {
    redirect("/auth/update-password?error=Passwords%20do%20not%20match")
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth?error=Use%20your%20password%20reset%20link%20again")
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    redirect(`/auth/update-password?error=${encodeURIComponent(error.message)}`)
  }

  redirect("/dashboard")
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  redirect("/auth")
}

export async function completeOnboardingAction(formData: FormData) {
  const input = onboardingSchema.parse({
    fullName: getString(formData, "fullName"),
    primaryGoal: getString(formData, "primaryGoal"),
    foodSupport: getArray(formData, "foodSupport"),
    fitnessLevel: getString(formData, "fitnessLevel"),
    dietaryPreferences: getArray(formData, "dietaryPreferences"),
    availabilityDays: getString(formData, "availabilityDays"),
    availabilityTime: getString(formData, "availabilityTime"),
    sessionLength: getString(formData, "sessionLength"),
    programId: getString(formData, "programId"),
    disclaimerAccepted: formData.get("disclaimerAccepted") === "on",
  })

  const profile = await getCurrentProfile("client", { allowIncompleteOnboarding: true })

  if (requireSupabaseForWrite()) {
    const supabase = await createClient()
    await mustWrite(supabase.from("profiles").update({
      full_name: input.fullName,
      dietary_preferences: input.dietaryPreferences,
      availability: `${input.availabilityDays}, ${input.availabilityTime}, ${input.sessionLength}`,
    }).eq("id", profile.id))

    await mustWrite(supabase.from("client_intakes").upsert(
      {
        client_id: profile.id,
        full_name: input.fullName,
        primary_goal: input.primaryGoal,
        food_support: input.foodSupport,
        fitness_level: input.fitnessLevel,
        dietary_preferences: input.dietaryPreferences,
        availability_days: input.availabilityDays,
        availability_time: input.availabilityTime,
        session_length: input.sessionLength,
        program_id: input.programId,
        disclaimer_ack_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      },
      { onConflict: "client_id" }
    ))

    const { data: coachLink } = await mustWrite(
      supabase
        .from("coach_clients")
        .select("coach_id")
        .eq("client_id", profile.id)
        .eq("status", "active")
        .maybeSingle()
    )

    const { data: existingEnrollment } = await mustWrite(
      supabase
        .from("program_enrollments")
        .select("id")
        .eq("client_id", profile.id)
        .eq("program_id", input.programId)
        .maybeSingle()
    )

    if (!existingEnrollment) {
      await mustWrite(supabase.from("program_enrollments").insert({
        client_id: profile.id,
        program_id: input.programId,
        coach_id: coachLink?.coach_id ?? null,
        status: "active",
        started_at: new Date().toISOString().slice(0, 10),
        current_week: 1,
      }))
    }
  }

  redirect("/dashboard")
}

export async function submitCheckInAction(formData: FormData) {
  const input = checkInSchema.parse({
    mood: getString(formData, "mood"),
    win: getString(formData, "win"),
    challenge: getString(formData, "challenge"),
    supportNeeded: getString(formData, "supportNeeded"),
  })
  const profile = await getCurrentProfile("client")

  if (requireSupabaseForWrite()) {
    const supabase = await createClient()
    const { data: coachLink } = await mustWrite(
      supabase
        .from("coach_clients")
        .select("coach_id")
        .eq("client_id", profile.id)
        .eq("status", "active")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle()
    )

    await mustWrite(supabase.from("check_ins").insert({
      client_id: profile.id,
      coach_id: coachLink?.coach_id ?? null,
      mood: input.mood,
      win: input.win,
      challenge: input.challenge,
      support_needed: input.supportNeeded,
    }))

    await mustWrite(supabase.from("non_scale_wins").insert({
      client_id: profile.id,
      body: input.win,
      won_at: new Date().toISOString().slice(0, 10),
    }))
  }

  redirectWithPath("/dashboard")
}

export async function addRecipeToMealPlanAction(formData: FormData) {
  const recipeId = getString(formData, "recipeId")
  const profile = await getCurrentProfile("client")

  if (requireSupabaseForWrite()) {
    const supabase = await createClient()
    const weekStart = new Date().toISOString().slice(0, 10)
    const { data: plan } = await mustWrite(supabase
      .from("meal_plans")
      .upsert(
        { client_id: profile.id, week_start: weekStart },
        { onConflict: "client_id,week_start" }
      )
      .select("id")
      .single())

    if (plan) {
      await mustWrite(supabase.from("meal_plan_items").insert({
        meal_plan_id: plan.id,
        recipe_id: recipeId,
        meal_date: weekStart,
        meal_slot: "Lunch",
      }))
    }
  }

  redirectWithPath("/recipes")
}

export async function addRecipeToShoppingListAction(formData: FormData) {
  const recipeId = getString(formData, "recipeId")
  const label = getString(formData, "label") || "Recipe ingredients"
  const profile = await getCurrentProfile("client")

  if (requireSupabaseForWrite()) {
    const supabase = await createClient()
    const { data: ingredients } = await mustWrite(
      supabase
        .from("recipe_ingredients")
        .select("label, quantity, sort_order")
        .eq("recipe_id", recipeId)
        .order("sort_order", { ascending: true })
    )
    const rows = (ingredients ?? []).map((ingredient) => ({
      client_id: profile.id,
      recipe_id: recipeId,
      label: ingredient.quantity ? `${ingredient.quantity} ${ingredient.label}` : ingredient.label,
    }))

    await mustWrite(supabase
      .from("shopping_list_items")
      .insert(rows.length ? rows : [{ client_id: profile.id, recipe_id: recipeId, label }]))
  }

  redirectWithPath("/recipes")
}

export async function updateShoppingListAction(formData: FormData) {
  const checkedIds = getArray(formData, "shoppingItem")
  const profile = await getCurrentProfile("client")

  if (requireSupabaseForWrite()) {
    const supabase = await createClient()
    await mustWrite(
      supabase
        .from("shopping_list_items")
        .update({ checked_at: null })
        .eq("client_id", profile.id)
    )

    if (checkedIds.length > 0) {
      await mustWrite(
        supabase
          .from("shopping_list_items")
          .update({ checked_at: new Date().toISOString() })
          .eq("client_id", profile.id)
          .in("id", checkedIds)
      )
    }
  }

  redirectWithPath("/recipes")
}

export async function saveRecipeAction(formData: FormData) {
  const recipeId = getString(formData, "recipeId")
  const profile = await getCurrentProfile("client")

  if (requireSupabaseForWrite()) {
    const supabase = await createClient()
    await mustWrite(supabase.from("recipe_saves").upsert(
      {
        client_id: profile.id,
        recipe_id: recipeId,
      },
      { onConflict: "client_id,recipe_id" }
    ))
  }

  redirectWithPath("/recipes")
}

export async function completeWorkoutAction(formData: FormData) {
  const workoutId = getString(formData, "workoutId")
  const effort = Number(getString(formData, "effort") || 7)
  const notes = getString(formData, "notes")
  const exerciseIds = getArray(formData, "exercise")
  const exerciseStatus = Object.fromEntries(exerciseIds.map((id) => [id, true]))
  const profile = await getCurrentProfile("client")

  if (requireSupabaseForWrite()) {
    const supabase = await createClient()
    await mustWrite(supabase.from("workout_completions").insert({
      client_id: profile.id,
      workout_id: workoutId,
      effort,
      notes_for_coach: notes,
      exercise_status: exerciseStatus,
    }))
  }

  redirectWithPath("/workouts")
}

export async function completeLessonAction(formData: FormData) {
  const lessonId = getString(formData, "lessonId")
  const profile = await getCurrentProfile("client")

  if (!lessonId) {
    throw new Error("A lesson is required.")
  }

  if (requireSupabaseForWrite()) {
    const supabase = await createClient()
    const { data: lessonData } = await mustWrite(
      supabase
        .from("lessons")
        .select("id, program_week_id, status")
        .eq("id", lessonId)
        .single()
    )
    const lesson = requireRow(lessonData, "Lesson was not found.")

    if (lesson.status !== "published" && lesson.status !== "scheduled") {
      throw new Error("This lesson is not available yet.")
    }

    const { data: weekData } = await mustWrite(
      supabase
        .from("program_weeks")
        .select("id, program_id, week_number")
        .eq("id", lesson.program_week_id)
        .single()
    )
    const week = requireRow(weekData, "Program week was not found.")

    const { data: enrollmentData } = await mustWrite(
      supabase
        .from("program_enrollments")
        .select("id, current_week")
        .eq("client_id", profile.id)
        .eq("program_id", week.program_id)
        .eq("status", "active")
        .single()
    )
    const enrollment = requireRow(enrollmentData, "You are not enrolled in this program.")

    if (week.week_number > Number(enrollment.current_week)) {
      throw new Error("Complete the current week before unlocking this lesson.")
    }

    await mustWrite(supabase.from("lesson_progress").upsert(
      {
        client_id: profile.id,
        lesson_id: lessonId,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "client_id,lesson_id" }
    ))

    const { data: weekLessons } = await mustWrite(
      supabase
        .from("lessons")
        .select("id")
        .eq("program_week_id", week.id)
        .in("status", ["published", "scheduled"])
    )
    const weekLessonIds = (weekLessons ?? []).map((row) => row.id)

    if (weekLessonIds.length > 0) {
      const { data: progressRows } = await mustWrite(
        supabase
          .from("lesson_progress")
          .select("lesson_id")
          .eq("client_id", profile.id)
          .in("lesson_id", weekLessonIds)
      )
      const completedLessonIds = new Set((progressRows ?? []).map((row) => row.lesson_id))
      const completedWeek = weekLessonIds.every((id) => completedLessonIds.has(id))

      if (completedWeek) {
        const { data: programData } = await mustWrite(
          supabase
            .from("programs")
            .select("duration_weeks")
            .eq("id", week.program_id)
            .single()
        )
        const program = requireRow(programData, "Program was not found.")
        const currentWeek = Number(enrollment.current_week)
        const durationWeeks = Number(program.duration_weeks)
        const nextWeek = Math.min(durationWeeks, Math.max(currentWeek, week.week_number + 1))

        await mustWrite(
          supabase
            .from("program_enrollments")
            .update({
              current_week: nextWeek,
              completed_at: week.week_number >= durationWeeks ? new Date().toISOString() : null,
            })
            .eq("id", enrollment.id)
        )
      }
    }
  }

  redirectWithPath(`/programs?lesson=${lessonId}`)
}

export async function updateRsvpAction(formData: FormData) {
  const eventId = getString(formData, "eventId")
  const status = getString(formData, "status") || "going"
  const profile = await getCurrentProfile("client")

  if (requireSupabaseForWrite()) {
    const supabase = await createClient()
    await mustWrite(supabase.from("event_rsvps").upsert(
      {
        event_id: eventId,
        client_id: profile.id,
        status,
        reminder_enabled: getBool(formData, "reminderEnabled"),
        reminder_minutes: Number(getString(formData, "reminderMinutes") || 15),
      },
      { onConflict: "event_id,client_id" }
    ))
  }

  redirectWithPath("/live-calls")
}

export async function saveGoalAction(formData: FormData) {
  const profile = await getCurrentProfile("client")
  const title = getString(formData, "title")
  const description = getString(formData, "description")

  if (requireSupabaseForWrite()) {
    const supabase = await createClient()
    await mustWrite(supabase.from("goals").insert({
      client_id: profile.id,
      title,
      description,
      target_days: Number(getString(formData, "targetDays") || 3),
      metric: getString(formData, "metric") || "Days completed",
    }))
  }

  redirectWithPath("/goals")
}

export async function toggleGoalLogAction(formData: FormData) {
  const profile = await getCurrentProfile("client")
  const goalId = getString(formData, "goalId")
  const completed = formData.get("completed") === "on"

  if (requireSupabaseForWrite()) {
    const supabase = await createClient()
    await mustWrite(supabase.from("goal_logs").upsert(
      {
        goal_id: goalId,
        client_id: profile.id,
        log_date: new Date().toISOString().slice(0, 10),
        completed,
      },
      { onConflict: "goal_id,client_id,log_date" }
    ))
  }

  redirectWithPath("/goals")
}

export async function logMetricEntryAction(formData: FormData) {
  const profile = await getCurrentProfile("client")
  const input = metricEntrySchema.parse({
    metric: getString(formData, "metric"),
    value: getString(formData, "value"),
    unit: getString(formData, "unit") || undefined,
    note: getString(formData, "note") || undefined,
  })

  if (requireSupabaseForWrite()) {
    const supabase = await createClient()
    await mustWrite(supabase.from("metric_entries").insert({
      client_id: profile.id,
      metric: input.metric,
      value: input.value,
      unit: input.unit ?? null,
      note: input.note ?? null,
    }))
  }

  redirectWithPath("/goals")
}

export async function createCommunityPostAction(formData: FormData) {
  const input = communityPostSchema.parse({
    topic: getString(formData, "topic"),
    title: getString(formData, "title"),
    body: getString(formData, "body"),
    pinned: formData.get("pinned") === "on",
  })
  const profile = await getCurrentProfile("client")

  if (requireSupabaseForWrite()) {
    const supabase = await createClient()
    const { data: topic } = await mustWrite(supabase
      .from("community_topics")
      .select("id")
      .eq("title", input.topic)
      .single())

    if (topic) {
      await mustWrite(supabase.from("community_posts").insert({
        topic_id: topic.id,
        author_id: profile.id,
        title: input.title,
        body: input.body,
        pinned: input.pinned && profile.role !== "client",
      }))
    }
  }

  redirectWithPath("/community")
}

export async function createCommunityCommentAction(formData: FormData) {
  const postId = getString(formData, "postId")
  const body = getString(formData, "body")
  const profile = await getCurrentProfile("client")

  if (requireSupabaseForWrite()) {
    const supabase = await createClient()
    await mustWrite(supabase.from("community_comments").insert({
      post_id: postId,
      author_id: profile.id,
      body,
    }))
  }

  redirectWithPath("/community")
}

export async function addCommunityReactionAction(formData: FormData) {
  const postId = getString(formData, "postId")
  const reaction = getString(formData, "reaction") || "heart"
  const profile = await getCurrentProfile("client")

  if (requireSupabaseForWrite()) {
    const supabase = await createClient()
    const { data: existingReaction } = await mustWrite(
      supabase
        .from("community_reactions")
        .select("id")
        .eq("post_id", postId)
        .eq("author_id", profile.id)
        .eq("reaction", reaction)
        .maybeSingle()
    )

    if (!existingReaction) {
      await mustWrite(supabase.from("community_reactions").insert({
        post_id: postId,
        author_id: profile.id,
        reaction,
      }))
    }
  }

  redirectWithPath("/community")
}

export async function reportCommunityPostAction(formData: FormData) {
  const postId = getString(formData, "postId")
  const reason = getString(formData, "reason") || "Member reported this post for review."
  const profile = await getCurrentProfile("client")

  if (requireSupabaseForWrite()) {
    const supabase = await createClient()
    await mustWrite(supabase.from("community_reports").insert({
      post_id: postId,
      reporter_id: profile.id,
      reason,
    }))
  }

  redirectWithPath("/community")
}

export async function saveResourceReadAction(formData: FormData) {
  const resourceId = getString(formData, "resourceId")
  const completed = formData.get("completed") === "on"
  const saved = formData.get("saved") === "on"
  const profile = await getCurrentProfile("client")

  if (requireSupabaseForWrite()) {
    const supabase = await createClient()
    await mustWrite(supabase.from("resource_reads").upsert(
      {
        resource_id: resourceId,
        client_id: profile.id,
        saved,
        completed_at: completed ? new Date().toISOString() : null,
        last_read_at: new Date().toISOString(),
      },
      { onConflict: "resource_id,client_id" }
    ))
  }

  redirectWithPath("/resources")
}

export async function sendMessageAction(formData: FormData) {
  const input = messageSchema.parse({
    conversationId: getString(formData, "conversationId"),
    body: getString(formData, "body"),
  })
  const profile = await getCurrentProfile("client")

  if (requireSupabaseForWrite()) {
    const supabase = await createClient()
    await mustWrite(supabase.from("messages").insert({
      conversation_id: input.conversationId,
      sender_id: profile.id,
      body: input.body,
    }))
  }

  redirectWithPath("/messages")
}

export async function startConversationAction() {
  await getCurrentProfile("client")

  if (requireSupabaseForWrite()) {
    const supabase = await createClient()
    await mustWrite(supabase.rpc("start_coach_conversation"))
  }

  redirectWithPath("/messages")
}

export async function saveProfileAction(formData: FormData) {
  const input = profileSchema.parse({
    fullName: getString(formData, "fullName"),
    timezone: getString(formData, "timezone"),
    notificationEmail: getBool(formData, "notificationEmail"),
    notificationSms: getBool(formData, "notificationSms"),
    dietaryPreferences: getArray(formData, "dietaryPreferences"),
    availability: getString(formData, "availability"),
  })
  const profile = await getCurrentProfile("client")
  const existingPreferences = profile.notificationPreferences

  if (requireSupabaseForWrite()) {
    const supabase = await createClient()
    await mustWrite(
      supabase.from("profiles").update({
        full_name: input.fullName,
        timezone: input.timezone,
        dietary_preferences: input.dietaryPreferences,
        availability: input.availability,
        notification_preferences: {
          ...existingPreferences,
          email: input.notificationEmail,
          sms: input.notificationSms,
        },
      }).eq("id", profile.id)
    )
  }

  redirectWithPath("/profile")
}

export async function saveSettingsAction(formData: FormData) {
  const profile = await getCurrentProfile("client")
  const existingPreferences = profile.notificationPreferences

  if (requireSupabaseForWrite()) {
    const supabase = await createClient()
    await mustWrite(
      supabase.from("profiles").update({
        notification_preferences: {
          ...existingPreferences,
          email: getBool(formData, "notificationEmail"),
          sms: getBool(formData, "notificationSms"),
          calls: getBool(formData, "notificationCalls"),
          community: getBool(formData, "notificationCommunity"),
        },
      }).eq("id", profile.id)
    )
  }

  redirectWithPath("/settings")
}

export async function adminCreateContentAction(formData: FormData) {
  const coach = await requireCoachProfile()
  const type = getString(formData, "type")
  const status = getStatus(formData)
  const metadata = formMetadata(formData)
  let handled = false

  if (type === "recipe") {
    handled = true
    const input = adminRecipeSchema.parse({
      title: getString(formData, "title"),
      description: getString(formData, "description") || "Coach-created balanced recipe.",
      mealType: getString(formData, "mealType"),
      ingredients: getArray(formData, "ingredients"),
      steps: getArray(formData, "steps"),
      servings: getString(formData, "servings"),
      prepMinutes: getString(formData, "prepMinutes"),
      status,
      protein: getString(formData, "protein") || undefined,
      carbs: getString(formData, "carbs") || undefined,
      fat: getString(formData, "fat") || undefined,
      calories: getString(formData, "calories") || undefined,
      dietaryTags: getArray(formData, "dietaryTags"),
    })

    if (requireSupabaseForWrite()) {
      const supabase = await createClient()
      const { data: recipe } = await mustWrite(
        supabase
          .from("recipes")
          .insert({
            coach_id: coach.id,
            title: input.title,
            description: getString(formData, "description") || "Coach-created balanced recipe.",
            meal_type: input.mealType,
            difficulty: getString(formData, "difficulty") || "Easy",
            servings: input.servings,
            prep_minutes: input.prepMinutes,
            cook_minutes: Number(getString(formData, "cookMinutes") || 0),
            calories: input.calories ?? null,
            protein: input.protein ?? null,
            carbs: input.carbs ?? null,
            fat: input.fat ?? null,
            dietary_tags: input.dietaryTags,
            status: input.status,
            published_at: input.status === "published" ? new Date().toISOString() : null,
            created_by: coach.id,
          })
          .select("id")
          .single()
      )
      if (!recipe) {
        throw new Error("Recipe was not created.")
      }

      await mustWrite(
        supabase.from("recipe_ingredients").insert(
          input.ingredients.map((label, index) => ({
            recipe_id: recipe.id,
            label,
            sort_order: index + 1,
          }))
        )
      )
      await mustWrite(
        supabase.from("recipe_steps").insert(
          input.steps.map((body, index) => ({
            recipe_id: recipe.id,
            body,
            sort_order: index + 1,
          }))
        )
      )
    }
  }
  if (type === "workout") {
    handled = true
    const input = adminWorkoutSchema.parse({
      title: getString(formData, "title"),
      durationMinutes: getString(formData, "durationMinutes"),
      difficulty: getString(formData, "difficulty"),
      category: getString(formData, "category"),
      exercises: getArray(formData, "exercises").map((name) => ({
        name,
        sets: 3,
        reps: "10",
        rest: "60s",
      })),
      status,
      videoUrl: getString(formData, "videoUrl"),
    })

    if (requireSupabaseForWrite()) {
      const supabase = await createClient()
      const { data: workout } = await mustWrite(
        supabase
          .from("workouts")
          .insert({
            coach_id: coach.id,
            title: input.title,
            description: getString(formData, "description") || "Coach-created workout session.",
            category: input.category,
            difficulty: input.difficulty,
            duration_minutes: input.durationMinutes,
            equipment: getArray(formData, "equipment"),
            calories_estimate: Number(getString(formData, "caloriesEstimate") || 0) || null,
            video_url: input.videoUrl || null,
            coach_notes: getString(formData, "coachNotes") || null,
            safety_notes: getString(formData, "safetyNotes") || null,
            status: input.status,
            published_at: input.status === "published" ? new Date().toISOString() : null,
            created_by: coach.id,
          })
          .select("id")
          .single()
      )
      if (!workout) {
        throw new Error("Workout was not created.")
      }

      await mustWrite(
        supabase.from("workout_exercises").insert(
          input.exercises.map((exercise, index) => ({
            workout_id: workout.id,
            name: exercise.name,
            sets: exercise.sets,
            reps: exercise.reps,
            rest: exercise.rest,
            sort_order: index + 1,
          }))
        )
      )
    }
  }
  if (type === "live-call") {
    handled = true
    const input = adminLiveCallSchema.parse({
      title: getString(formData, "title"),
      startsAt: getString(formData, "startsAt"),
      durationMinutes: getString(formData, "durationMinutes"),
      callUrl: getString(formData, "callUrl"),
      timezone: getString(formData, "timezone") || "America/Los_Angeles",
      agenda: getArray(formData, "agenda"),
      status,
      targetSelection: getString(formData, "targetSelection") || "all_clients",
    })
    const { targetType, targetId } = parseTargetSelection(input.targetSelection ?? "all_clients")

    if (requireSupabaseForWrite()) {
      const supabase = await createClient()
      const { data: event } = await mustWrite(
        supabase
          .from("calendar_events")
          .insert({
            coach_id: coach.id,
            client_id: targetType === "client" ? targetId : null,
            program_id: targetType === "program" ? targetId : null,
            event_type: "live_call",
            title: input.title,
            description: getString(formData, "description") || "Live coaching call.",
            starts_at: new Date(input.startsAt).toISOString(),
            ends_at: addMinutes(input.startsAt, input.durationMinutes),
            timezone: input.timezone,
            item_type: "live_call",
            call_url: input.callUrl,
            required: true,
            status: input.status,
          })
          .select("id")
          .single()
      )
      if (!event) {
        throw new Error("Live call was not created.")
      }

      await mustWrite(
        supabase.from("event_agenda_items").insert(
          input.agenda.map((label, index) => ({
            event_id: event.id,
            label,
            sort_order: index + 1,
          }))
        )
      )
    }
  }
  if (type === "resource") {
    handled = true
    const input = adminResourceSchema.parse({
      title: getString(formData, "title"),
      type: getString(formData, "resourceType") || "article",
      summary: getString(formData, "summary"),
      content: getString(formData, "content"),
      status,
      topic: getString(formData, "topic") || "Nutrition",
    })

    if (requireSupabaseForWrite()) {
      const supabase = await createClient()
      await mustWrite(supabase.from("resources").insert({
        coach_id: coach.id,
        title: input.title,
        summary: input.summary,
        body: input.content,
        type: input.type,
        topic: input.topic,
        url: getString(formData, "url") || null,
        read_minutes: Number(getString(formData, "readMinutes") || 5),
        tags: getArray(formData, "tags"),
        featured: getBool(formData, "featured"),
        status: input.status,
        published_at: input.status === "published" ? new Date().toISOString() : null,
        created_by: coach.id,
      }))
    }
  }
  if (type === "goal") {
    handled = true
    const input = adminGoalSchema.parse({
      title: getString(formData, "title"),
      description: getString(formData, "description"),
      targetDays: getString(formData, "targetDays"),
      metric: getString(formData, "metric"),
      status,
    })

    if (requireSupabaseForWrite()) {
      const supabase = await createClient()
      await mustWrite(supabase.from("goals").insert({
        coach_id: coach.id,
        client_id: null,
        title: input.title,
        icon: getString(formData, "icon") || "leaf",
        description: input.description,
        target_days: input.targetDays,
        metric: input.metric,
        reminder_time: getString(formData, "reminderTime") || null,
        why_it_matters: getString(formData, "whyItMatters") || null,
        status: input.status,
        created_by: coach.id,
      }))
    }
  }
  if (type === "program") {
    handled = true
    const input = adminProgramSchema.parse({
      title: getString(formData, "title"),
      description: getString(formData, "description"),
      durationWeeks: getString(formData, "durationWeeks") || "6",
      bestFor: getString(formData, "bestFor") || "Healthy lifestyle, balanced meals, and sustainable fitness",
      status,
    })

    if (requireSupabaseForWrite()) {
      const supabase = await createClient()
      await mustWrite(supabase.from("programs").insert({
        slug: `${slugify(input.title)}-${Date.now()}`,
        coach_id: coach.id,
        title: input.title,
        description: input.description,
        duration_weeks: input.durationWeeks,
        best_for: input.bestFor,
        status: input.status,
        published_at: input.status === "published" ? new Date().toISOString() : null,
        created_by: coach.id,
      }))
    }
  }

  if (!handled) {
    throw new Error(`Unsupported content type: ${type}`)
  }

  if (requireSupabaseForWrite()) {
    const supabase = await createClient()
    await mustWrite(supabase.from("admin_audit_events").insert({
      actor_id: coach.id,
      action: "create",
      entity_type: type,
      metadata,
    }))
  }

  redirectWithPath("/admin/content")
}

export async function adminAddClientAction(formData: FormData) {
  const coach = await requireCoachProfile()
  const email = getString(formData, "email")
  const fullName = getString(formData, "fullName")
  const programId = getString(formData, "programId")

  if (requireSupabaseForWrite()) {
    const supabase = await createClient()
    const code = `HW-${randomBytes(4).toString("hex").toUpperCase()}`
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    await mustWrite(supabase.from("invitations").insert({
      code,
      email,
      coach_id: coach.id,
      role: "client",
      program_id: programId || null,
      expires_at: expiresAt.toISOString(),
    }))

    const { data: program } = programId
      ? await mustWrite(
          supabase
            .from("programs")
            .select("title")
            .eq("id", programId)
            .maybeSingle()
        )
      : { data: null }

    await mustWrite(supabase.from("admin_audit_events").insert({
      actor_id: coach.id,
      action: "invite_client",
      entity_type: "client",
      metadata: { email, fullName, programId, programTitle: program?.title ?? null, inviteCode: code },
    }))
  }

  redirectWithPath("/admin/clients")
}

export async function adminDuplicateAction(formData: FormData) {
  const coach = await requireCoachProfile()
  const entityType = getString(formData, "entityType")
  const entityId = getString(formData, "entityId")

  if (requireSupabaseForWrite()) {
    const supabase = await createClient()
    const duplicateContent = async (table: string) => {
      const { data } = await mustWrite(supabase.from(table).select("*").eq("id", entityId).single())

      const row = data as Record<string, unknown>
      const {
        id: _id,
        created_at: _createdAt,
        updated_at: _updatedAt,
        published_at: _publishedAt,
        slug: _slug,
        ...copy
      } = row
      const title = `${String(row.title ?? "Content")} Copy`

      const { data: created } = await mustWrite(
        supabase
          .from(table)
          .insert({
            ...copy,
            title,
            ...(table === "programs"
              ? { slug: `${slugify(title)}-${Date.now()}` }
              : {}),
            status: "draft",
            ...(table === "goals" ? {} : { published_at: null }),
            created_by: coach.id,
          })
          .select("id")
          .single()
      )

      return created?.id as string | undefined
    }

    const duplicateEvent = async () => {
      const { data } = await mustWrite(
        supabase.from("calendar_events").select("*").eq("id", entityId).single()
      )

      const row = data as Record<string, unknown>
      const {
        id: _id,
        created_at: _createdAt,
        updated_at: _updatedAt,
        ...copy
      } = row

      const { data: created } = await mustWrite(
        supabase
          .from("calendar_events")
          .insert({
            ...copy,
            title: `${String(row.title ?? "Event")} Copy`,
            status: "draft",
          })
          .select("id")
          .single()
      )

      return created?.id as string | undefined
    }

    let duplicatedId: string | undefined | null
    const normalizedEntityType = normalizeContentType(entityType)

    if (normalizedEntityType === "workout") {
      duplicatedId = await duplicateContent("workouts")
      if (duplicatedId) {
        const { data: exercises } = await mustWrite(
          supabase
            .from("workout_exercises")
            .select("name, sets, reps, rest, notes, sort_order")
            .eq("workout_id", entityId)
        )
        if (exercises?.length) {
          await mustWrite(supabase.from("workout_exercises").insert(
            exercises.map((exercise) => ({
              ...exercise,
              workout_id: duplicatedId,
            }))
          ))
        }
      }
    }
    if (normalizedEntityType === "recipe") {
      duplicatedId = await duplicateContent("recipes")
      if (duplicatedId) {
        const { data: ingredients } = await mustWrite(
          supabase
            .from("recipe_ingredients")
            .select("label, quantity, sort_order")
            .eq("recipe_id", entityId)
        )
        const { data: steps } = await mustWrite(
          supabase
            .from("recipe_steps")
            .select("body, sort_order")
            .eq("recipe_id", entityId)
        )
        if (ingredients?.length) {
          await mustWrite(supabase.from("recipe_ingredients").insert(
            ingredients.map((ingredient) => ({
              ...ingredient,
              recipe_id: duplicatedId,
            }))
          ))
        }
        if (steps?.length) {
          await mustWrite(supabase.from("recipe_steps").insert(
            steps.map((step) => ({
              ...step,
              recipe_id: duplicatedId,
            }))
          ))
        }
      }
    }
    if (normalizedEntityType === "resource") duplicatedId = await duplicateContent("resources")
    if (normalizedEntityType === "program") duplicatedId = await duplicateContent("programs")
    if (normalizedEntityType === "goal") duplicatedId = await duplicateContent("goals")
    if (normalizedEntityType === "livecall") duplicatedId = await duplicateEvent()

    if (!duplicatedId) {
      throw new Error(`Unable to duplicate ${entityType}.`)
    }

    await mustWrite(supabase.from("admin_audit_events").insert({
      actor_id: coach.id,
      action: "duplicate",
      entity_type: entityType,
      entity_id: entityId || null,
      metadata: { duplicatedId },
    }))
  }

  redirectWithPath("/admin/content")
}

export async function adminUpdateContentAction(formData: FormData) {
  const coach = await requireCoachProfile()
  const entityType = getString(formData, "entityType")
  const entityId = getString(formData, "entityId")
  const title = getString(formData, "title")
  const status = getString(formData, "status") || "published"

  if (requireSupabaseForWrite()) {
    const supabase = await createClient()
    const updates = {
      title,
      status,
      updated_at: new Date().toISOString(),
    }

    const normalizedEntityType = normalizeContentType(entityType)
    let updated = true

    if (normalizedEntityType === "workout") await mustWrite(supabase.from("workouts").update(updates).eq("id", entityId))
    else if (normalizedEntityType === "recipe") await mustWrite(supabase.from("recipes").update(updates).eq("id", entityId))
    else if (normalizedEntityType === "resource") await mustWrite(supabase.from("resources").update(updates).eq("id", entityId))
    else if (normalizedEntityType === "program") await mustWrite(supabase.from("programs").update(updates).eq("id", entityId))
    else if (normalizedEntityType === "goal") await mustWrite(supabase.from("goals").update(updates).eq("id", entityId))
    else if (normalizedEntityType === "livecall") await mustWrite(supabase.from("calendar_events").update(updates).eq("id", entityId))
    else updated = false

    if (!updated) {
      throw new Error(`Unsupported content type: ${entityType}`)
    }

    await mustWrite(supabase.from("admin_audit_events").insert({
      actor_id: coach.id,
      action: "update",
      entity_type: entityType,
      entity_id: entityId || null,
      metadata: formMetadata(formData),
    }))
  }

  redirectWithPath("/admin/content")
}

export async function adminAssignAction(formData: FormData) {
  const coach = await requireCoachProfile()
  const selectedContent = parseContentSelection(getString(formData, "contentSelection"))
  const entityType = selectedContent?.entityType ?? getString(formData, "entityType")
  const entityId = selectedContent?.entityId ?? getString(formData, "entityId")
  const target = getString(formData, "target")
  const targetType = getString(formData, "targetType")
  const targetId = getString(formData, "targetId")
  const dueDate = getString(formData, "dueDate")
  const returnTo = getString(formData, "returnTo") || "/admin/content"

  if (requireSupabaseForWrite()) {
    const supabase = await createClient()
    const startsAt = dueDate ? new Date(`${dueDate}T09:00:00`).toISOString() : new Date().toISOString()
    const contentKind = normalizeContentType(entityType)
    const normalizedType =
      contentKind === "livecall"
        ? "live_call"
        : contentKind === "calendarevent"
          ? "calendar_event"
          : contentKind
    const supportedTypes = new Set(["workout", "recipe", "resource", "live_call", "program", "goal", "calendar_event"])
    if (!entityId || !supportedTypes.has(normalizedType)) {
      throw new Error(`Unsupported assignment type: ${entityType}`)
    }

    let source: AssignableSource | null = null
    if (normalizedType === "workout") {
      const { data } = await mustWrite(
        supabase.from("workouts").select("title, description, status").eq("id", entityId).single()
      )
      source = requireRow(data, "Workout was not found.")
    } else if (normalizedType === "recipe") {
      const { data } = await mustWrite(
        supabase.from("recipes").select("title, description, status").eq("id", entityId).single()
      )
      source = requireRow(data, "Recipe was not found.")
    } else if (normalizedType === "resource") {
      const { data } = await mustWrite(
        supabase.from("resources").select("title, summary, status").eq("id", entityId).single()
      )
      const resource = requireRow(data, "Resource was not found.")
      source = {
        title: resource.title,
        description: resource.summary,
        status: resource.status,
      }
    } else if (normalizedType === "program") {
      const { data } = await mustWrite(
        supabase.from("programs").select("title, description, status").eq("id", entityId).single()
      )
      source = requireRow(data, "Program was not found.")
    } else if (normalizedType === "goal") {
      const { data } = await mustWrite(
        supabase.from("goals").select("title, description, status").eq("id", entityId).single()
      )
      source = requireRow(data, "Goal was not found.")
    } else if (normalizedType === "live_call") {
      const { data } = await mustWrite(
        supabase
          .from("calendar_events")
          .select("title, description, status, call_url")
          .eq("id", entityId)
          .single()
      )
      const liveCall = requireRow(data, "Live call was not found.")
      source = {
        title: liveCall.title,
        description: liveCall.description ?? "",
        status: liveCall.status,
        callUrl: liveCall.call_url,
        eventType: "live_call",
        itemType: "live_call",
        itemId: entityId,
      }
    } else if (normalizedType === "calendar_event") {
      const { data } = await mustWrite(
        supabase
          .from("calendar_events")
          .select("title, description, status, call_url, event_type, item_type, item_id")
          .eq("id", entityId)
          .single()
      )
      const event = requireRow(data, "Schedule item was not found.")
      source = {
        title: event.title,
        description: event.description ?? "",
        status: event.status,
        callUrl: event.call_url,
        eventType: event.event_type,
        itemType: event.item_type,
        itemId: event.item_id,
      }
    }

    if (!source || (source.status !== "published" && source.status !== "scheduled")) {
      throw new Error("Publish this content before assigning it to clients.")
    }

    const eventType =
      normalizedType === "calendar_event" && source.eventType
        ? source.eventType
        : normalizedType === "workout"
        ? "workout"
        : normalizedType === "recipe" || normalizedType === "meal"
          ? "meal"
          : normalizedType === "live_call"
            ? "live_call"
            : normalizedType === "resource"
              ? "resource"
              : normalizedType === "program" || normalizedType === "goal"
                ? "custom"
                : null
    if (!eventType) {
      throw new Error(`Unsupported assignment type: ${entityType}`)
    }

    const itemType = source.itemType ?? selectedContent?.itemType ?? (normalizedType === "calendar_event" ? null : normalizedType)
    const itemId = source.itemId ?? (normalizedType === "calendar_event" ? null : entityId)
    const assignmentScope =
      targetType === "client" || targetType === "program" || targetType === "all_clients"
        ? targetType
        : targetId
          ? "client"
          : "all_clients"
    const clientId = assignmentScope === "client" ? targetId || null : null
    const programId = assignmentScope === "program" ? targetId || null : null
    let targetClientIds: string[] = []

    if (clientId) {
      targetClientIds = [clientId]
    } else if (assignmentScope === "all_clients") {
      const { data } = await mustWrite(
        supabase
          .from("coach_clients")
          .select("client_id")
          .eq("coach_id", coach.id)
          .eq("status", "active")
      )
      targetClientIds = (data ?? []).map((row) => row.client_id)
    } else if (programId) {
      const { data } = await mustWrite(
        supabase
          .from("program_enrollments")
          .select("client_id")
          .eq("program_id", programId)
          .eq("status", "active")
      )
      targetClientIds = (data ?? []).map((row) => row.client_id)
    }

    if (itemType === "resource" && itemId) {
      await mustWrite(supabase.from("resource_assignments").insert({
        resource_id: itemId,
        target_type: assignmentScope,
        target_id: targetId || null,
        assigned_by: coach.id,
        due_at: dueDate ? new Date(`${dueDate}T23:59:00`).toISOString() : null,
      }))
    }

    if (itemType === "program" && itemId && targetClientIds.length > 0) {
      await mustWrite(supabase.from("program_enrollments").upsert(
        targetClientIds.map((targetClientId) => ({
          client_id: targetClientId,
          program_id: itemId,
          coach_id: coach.id,
          status: "active",
          current_week: 1,
        })),
        { onConflict: "client_id,program_id" }
      ))
    }

    await mustWrite(supabase.from("calendar_events").insert({
      coach_id: coach.id,
      client_id: clientId,
      program_id: programId,
      event_type: eventType,
      title: itemType === "program" ? `Program assigned: ${source.title}` : source.title,
      description: source.description || (target ? `Assigned to ${target}` : "Assigned to all active clients"),
      starts_at: startsAt,
      ends_at: addMinutes(startsAt, 30),
      timezone: coach.timezone,
      item_type: itemType,
      item_id: itemId || null,
      call_url: source.callUrl ?? null,
      required: true,
      status: "published",
    }))

    await mustWrite(supabase.from("admin_audit_events").insert({
      actor_id: coach.id,
      action: "assign",
      entity_type: entityType,
      entity_id: entityId || null,
      metadata: { target, targetType: assignmentScope, targetId, dueDate },
    }))
  }

  redirectWithPath(returnTo)
}

export async function adminSaveScheduleAction(formData: FormData) {
  const coach = await requireCoachProfile()
  const input = adminScheduleSchema.parse({
    title: getString(formData, "title"),
    description: getString(formData, "description"),
    eventType: getString(formData, "eventType") || "custom",
    startsAt: getString(formData, "startsAt"),
    durationMinutes: getString(formData, "durationMinutes"),
    callUrl: getString(formData, "callUrl"),
    required: getBool(formData, "required"),
    targetSelection: getString(formData, "targetSelection") || "all_clients",
    itemSelection: getString(formData, "itemSelection") || "none",
  })
  const { targetType, targetId } = parseTargetSelection(input.targetSelection ?? "all_clients")
  const selectedContent = parseContentSelection(input.itemSelection ?? "none")

  if (requireSupabaseForWrite()) {
    const supabase = await createClient()
    let linkedCallUrl: string | null = null

    if (selectedContent) {
      const linkedType = selectedContent.itemType
      let linkedStatus: string | null = null

      if (linkedType === "workout") {
        const { data } = await mustWrite(
          supabase.from("workouts").select("status").eq("id", selectedContent.entityId).single()
        )
        linkedStatus = requireRow(data, "Linked workout was not found.").status
      } else if (linkedType === "recipe") {
        const { data } = await mustWrite(
          supabase.from("recipes").select("status").eq("id", selectedContent.entityId).single()
        )
        linkedStatus = requireRow(data, "Linked recipe was not found.").status
      } else if (linkedType === "resource") {
        const { data } = await mustWrite(
          supabase.from("resources").select("status").eq("id", selectedContent.entityId).single()
        )
        linkedStatus = requireRow(data, "Linked resource was not found.").status
      } else if (linkedType === "live_call") {
        const { data } = await mustWrite(
          supabase
            .from("calendar_events")
            .select("status, call_url")
            .eq("id", selectedContent.entityId)
            .single()
        )
        const linkedCall = requireRow(data, "Linked live call was not found.")
        linkedStatus = linkedCall.status
        linkedCallUrl = linkedCall.call_url ?? null
      }

      if (linkedStatus !== "published" && linkedStatus !== "scheduled") {
        throw new Error("Publish linked content before scheduling it for clients.")
      }

      if (linkedType === "resource") {
        await mustWrite(supabase.from("resource_assignments").insert({
          resource_id: selectedContent.entityId,
          target_type: targetType,
          target_id: targetId,
          assigned_by: coach.id,
          due_at: new Date(input.startsAt).toISOString(),
        }))
      }
    }

    await mustWrite(supabase.from("calendar_events").insert({
      coach_id: coach.id,
      client_id: targetType === "client" ? targetId : null,
      program_id: targetType === "program" ? targetId : null,
      event_type: input.eventType,
      title: input.title,
      description: input.description,
      starts_at: new Date(input.startsAt).toISOString(),
      ends_at: addMinutes(input.startsAt, input.durationMinutes),
      timezone: coach.timezone,
      item_type: selectedContent?.itemType ?? (input.eventType === "live_call" ? "live_call" : null),
      item_id: selectedContent?.entityId ?? null,
      call_url: input.callUrl || linkedCallUrl,
      required: input.required,
      status: "published",
    }))

    await mustWrite(supabase.from("admin_audit_events").insert({
      actor_id: coach.id,
      action: "schedule",
      entity_type: "calendar_event",
      metadata: {
        ...formMetadata(formData),
        targetType,
        targetId,
        itemType: selectedContent?.itemType ?? null,
        itemId: selectedContent?.entityId ?? null,
      },
    }))
  }

  redirectWithPath("/admin/schedule")
}

export async function adminArchiveAction(formData: FormData) {
  const coach = await requireCoachProfile()
  const entityType = getString(formData, "entityType")
  const entityId = getString(formData, "entityId")

  if (requireSupabaseForWrite()) {
    const supabase = await createClient()
    const normalizedEntityType = normalizeContentType(entityType)
    let archived = true

    if (normalizedEntityType === "workout") await mustWrite(supabase.from("workouts").update({ status: "archived" }).eq("id", entityId))
    else if (normalizedEntityType === "recipe") await mustWrite(supabase.from("recipes").update({ status: "archived" }).eq("id", entityId))
    else if (normalizedEntityType === "resource") await mustWrite(supabase.from("resources").update({ status: "archived" }).eq("id", entityId))
    else if (normalizedEntityType === "program") await mustWrite(supabase.from("programs").update({ status: "archived" }).eq("id", entityId))
    else if (normalizedEntityType === "goal") await mustWrite(supabase.from("goals").update({ status: "archived" }).eq("id", entityId))
    else if (normalizedEntityType === "livecall") await mustWrite(supabase.from("calendar_events").update({ status: "archived" }).eq("id", entityId))
    else if (normalizedEntityType === "communitypost") await mustWrite(supabase.from("community_posts").update({ hidden_at: new Date().toISOString() }).eq("id", entityId))
    else archived = false

    if (!archived) {
      throw new Error(`Unsupported content type: ${entityType}`)
    }

    await mustWrite(supabase.from("admin_audit_events").insert({
      actor_id: coach.id,
      action: "archive",
      entity_type: entityType,
      entity_id: entityId || null,
    }))
  }

  redirectWithPath("/admin/content")
}

export async function adminReplyCheckInAction(formData: FormData) {
  const coach = await requireCoachProfile()
  const checkInId = getString(formData, "checkInId")
  const clientId = getString(formData, "clientId")
  const body = getString(formData, "body")

  if (!clientId) {
    throw new Error("A real client ID is required to reply to a check-in.")
  }

  if (requireSupabaseForWrite()) {
    const supabase = await createClient()
    const { data: checkInData } = await mustWrite(
      supabase
        .from("check_ins")
        .select("id, client_id, coach_id")
        .eq("id", checkInId)
        .single()
    )
    const checkIn = requireRow(checkInData, "Check-in was not found.")

    if (checkIn.client_id !== clientId) {
      throw new Error("This reply does not match the selected client.")
    }

    if (coach.role !== "admin" && checkIn.coach_id && checkIn.coach_id !== coach.id) {
      throw new Error("This check-in is assigned to a different coach.")
    }

    await mustWrite(supabase.from("coach_feedback").insert({
      check_in_id: checkInId,
      client_id: clientId,
      coach_id: coach.id,
      body,
    }))
    await mustWrite(
      supabase
        .from("check_ins")
        .update({ status: "reviewed", resolved_at: null })
        .eq("id", checkInId)
    )
    await mustWrite(supabase.from("admin_audit_events").insert({
      actor_id: coach.id,
      action: "reply",
      entity_type: "check_in",
      entity_id: checkInId || null,
      metadata: { body },
    }))
  }

  redirectWithPath("/admin/check-ins")
}

export async function adminResolveCheckInAction(formData: FormData) {
  const coach = await requireCoachProfile()
  const checkInId = getString(formData, "checkInId")

  if (!checkInId) {
    throw new Error("A check-in ID is required to resolve the check-in.")
  }

  if (requireSupabaseForWrite()) {
    const supabase = await createClient()
    if (coach.role !== "admin") {
      const { data: checkInData } = await mustWrite(
        supabase
          .from("check_ins")
          .select("id, coach_id")
          .eq("id", checkInId)
          .single()
      )
      const checkIn = requireRow(checkInData, "Check-in was not found.")
      if (checkIn.coach_id && checkIn.coach_id !== coach.id) {
        throw new Error("This check-in is assigned to a different coach.")
      }
    }

    await mustWrite(
      supabase
        .from("check_ins")
        .update({ status: "resolved", resolved_at: new Date().toISOString() })
        .eq("id", checkInId)
    )
    await mustWrite(supabase.from("admin_audit_events").insert({
      actor_id: coach.id,
      action: "resolve",
      entity_type: "check_in",
      entity_id: checkInId,
    }))
  }

  redirectWithPath("/admin/check-ins")
}

export async function adminSendMessageAction(formData: FormData) {
  const coach = await requireCoachProfile()
  const input = messageSchema.parse({
    conversationId: getString(formData, "conversationId"),
    body: getString(formData, "body"),
  })

  if (requireSupabaseForWrite()) {
    const supabase = await createClient()
    await mustWrite(supabase.from("messages").insert({
      conversation_id: input.conversationId,
      sender_id: coach.id,
      body: input.body,
    }))
  }

  redirectWithPath("/admin/messages")
}

export async function adminStartConversationAction(formData: FormData) {
  await requireCoachProfile()
  const clientId = getString(formData, "clientId")

  if (!clientId) {
    throw new Error("Choose a client before starting a conversation.")
  }

  if (requireSupabaseForWrite()) {
    const supabase = await createClient()
    const { data } = await mustWrite(
      supabase.rpc("start_coach_conversation_for_client", {
        p_client_id: clientId,
      })
    )
    const conversationId = requireRow(data, "Unable to start a client conversation.")

    redirectWithPath(`/admin/messages?conversation=${conversationId}`)
  }

  redirectWithPath("/admin/messages")
}

export async function adminCreateAnnouncementAction(formData: FormData) {
  const coach = await requireCoachProfile()
  const input = communityPostSchema.parse({
    topic: getString(formData, "topic") || "Discussion",
    title: getString(formData, "title"),
    body: getString(formData, "body"),
    pinned: getBool(formData, "pinned"),
  })

  if (requireSupabaseForWrite()) {
    const supabase = await createClient()
    const { data: topic } = await mustWrite(
      supabase
        .from("community_topics")
        .select("id")
        .eq("title", input.topic)
        .single()
    )
    if (!topic) {
      throw new Error(`Community topic "${input.topic}" was not found.`)
    }

    await mustWrite(supabase.from("community_posts").insert({
      topic_id: topic.id,
      author_id: coach.id,
      title: input.title,
      body: input.body,
      pinned: input.pinned,
    }))
  }

  redirectWithPath("/admin/community")
}

export async function adminFlagCommunityPostAction(formData: FormData) {
  const coach = await requireCoachProfile()
  const postId = getString(formData, "postId")
  const reason = getString(formData, "reason") || "Coach flagged this post for moderation follow-up."

  if (requireSupabaseForWrite()) {
    const supabase = await createClient()
    await mustWrite(supabase.from("community_reports").insert({
      post_id: postId,
      reporter_id: coach.id,
      reason,
    }))
  }

  redirectWithPath("/admin/community")
}

export async function adminCreateCommunityCommentAction(formData: FormData) {
  const coach = await requireCoachProfile()
  const postId = getString(formData, "postId")
  const body = getString(formData, "body")

  if (requireSupabaseForWrite()) {
    const supabase = await createClient()
    await mustWrite(supabase.from("community_comments").insert({
      post_id: postId,
      author_id: coach.id,
      body,
    }))
  }

  redirectWithPath("/admin/community")
}

export async function adminPinAnnouncementAction(formData: FormData) {
  const coach = await requireCoachProfile()
  const postId = getString(formData, "postId")

  if (requireSupabaseForWrite()) {
    const supabase = await createClient()
    await mustWrite(
      supabase
        .from("community_posts")
        .update({ pinned: true })
        .eq("id", postId)
    )
    await mustWrite(supabase.from("admin_audit_events").insert({
      actor_id: coach.id,
      action: "pin",
      entity_type: "community_post",
      entity_id: postId || null,
    }))
  }

  redirectWithPath("/admin/community")
}

export async function adminSaveSettingsAction(formData: FormData) {
  const coach = await requireCoachProfile()
  const bio = getString(formData, "bio") || coach.bio || "Health coach supporting balanced nutrition and sustainable fitness."
  const availability = getString(formData, "availability") || coach.availability || "Availability pending"
  const input = adminSettingsSchema.parse({
    fullName: getString(formData, "fullName"),
    bio,
    timezone: getString(formData, "timezone"),
    availability,
    defaultProgramId: getString(formData, "defaultProgramId"),
    dietaryPreferences: formData.has("settingsSection") && getString(formData, "settingsSection") === "profile"
      ? getArray(formData, "dietaryPreferences")
      : undefined,
    notificationEmail: formData.has("notificationEmail") ? getBool(formData, "notificationEmail") : undefined,
    notificationSms: formData.has("notificationSms") ? getBool(formData, "notificationSms") : undefined,
    notificationCalls: formData.has("notificationCalls") ? getBool(formData, "notificationCalls") : undefined,
    notificationCommunity: formData.has("notificationCommunity") ? getBool(formData, "notificationCommunity") : undefined,
  })

  if (requireSupabaseForWrite()) {
    const supabase = await createClient()
    const existingPreferences = coach.notificationPreferences
    await mustWrite(
      supabase.from("profiles").update({
        full_name: input.fullName,
        bio: input.bio,
        timezone: input.timezone,
        availability: input.availability,
        dietary_preferences: input.dietaryPreferences ?? coach.dietaryPreferences,
        notification_preferences: {
          email: input.notificationEmail ?? existingPreferences.email,
          sms: input.notificationSms ?? existingPreferences.sms,
          push: existingPreferences.push,
          calls: input.notificationCalls ?? existingPreferences.calls,
          community: input.notificationCommunity ?? existingPreferences.community,
          defaultProgramId: input.defaultProgramId,
        },
      }).eq("id", coach.id)
    )
  }

  redirectWithPath("/admin/settings")
}
