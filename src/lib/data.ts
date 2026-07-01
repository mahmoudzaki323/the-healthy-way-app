import type {
  AdminContentItem,
  CalendarEvent,
  CheckIn,
  CommunityComment,
  CommunityPost,
  Conversation,
  Goal,
  Profile,
  Program,
  Recipe,
  Resource,
  Workout,
} from "./types"
import { createClient } from "./supabase/server"

// Supabase table coverage is broader than the generated local type stub.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

export type DashboardStats = {
  weeklyProgress: number
  workouts: string
  nutritionFocus: string
  checkIns: string
  liveCalls: string
  streakDays: number
}

export type InvitationSummary = {
  id: string
  code: string
  email: string
  role: "client" | "coach" | "admin"
  expiresAt: string | null
  acceptedAt: string | null
}

export type ClientRoster = {
  clients: Profile[]
  invitations: InvitationSummary[]
}

export type MealPlanSummary = {
  id: string
  recipeId: string
  title: string
  mealType: string
  mealDate: string
  mealSlot: string
  calories: number
}

export type ShoppingListEntry = {
  id: string
  label: string
  checked: boolean
  recipeTitle?: string
}

function assertRead(error: { message?: string } | null) {
  if (error) {
    throw new Error(error.message ?? "Unable to load app data")
  }
}

function toStatus(value: string | null | undefined): "draft" | "published" | "scheduled" | "archived" {
  if (value === "draft" || value === "scheduled" || value === "archived") return value
  return "published"
}

function isClient(profile?: Profile) {
  return profile?.role === "client"
}

function clientCanReadStatus(value: string | null | undefined) {
  return value === "published" || value === "scheduled"
}

function mapProfile(row: Row): Profile {
  const notificationPreferences = row.notification_preferences ?? {}

  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name || row.email || "Member",
    role: row.role ?? "client",
    avatarUrl: row.avatar_url ?? undefined,
    timezone: row.timezone ?? "America/Los_Angeles",
    bio: row.bio ?? undefined,
    dietaryPreferences: row.dietary_preferences ?? [],
    availability: row.availability ?? "",
    notificationPreferences: {
      email: notificationPreferences.email ?? true,
      sms: notificationPreferences.sms ?? false,
      push: notificationPreferences.push ?? false,
      calls: notificationPreferences.calls ?? true,
      community: notificationPreferences.community ?? true,
      defaultProgramId: notificationPreferences.defaultProgramId ?? undefined,
    },
  }
}

function byId<T extends { id: string }>(items: T[]) {
  return new Map(items.map((item) => [item.id, item]))
}

function groupBy<T extends Row>(items: T[], key: string) {
  return items.reduce<Map<string, T[]>>((map, item) => {
    const value = String(item[key] ?? "")
    if (!map.has(value)) map.set(value, [])
    map.get(value)!.push(item)
    return map
  }, new Map())
}

function relativeDate(value: string) {
  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()
  const diffHours = Math.floor(diffMs / 36e5)
  if (diffHours < 1) return "Just now"
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`

  return date.toLocaleDateString("en", { month: "short", day: "numeric" })
}

function eventState(startsAt: string): CalendarEvent["status"] {
  const starts = new Date(startsAt).getTime()
  const now = Date.now()
  if (starts < now - 36e5) return "complete"
  if (starts < now + 24 * 36e5) return "upcoming"
  return "later"
}

export async function getPrograms(profile?: Profile): Promise<Program[]> {
  const supabase = await createClient()
  const { data: programRows, error: programError } = await supabase
    .from("programs")
    .select("*")
    .neq("status", "archived")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
  assertRead(programError)

  const programs = ((programRows ?? []) as Row[]).filter((program) => (
    !isClient(profile) || clientCanReadStatus(program.status)
  ))
  if (!programs.length) return []

  const programIds = programs.map((program) => program.id)
  const { data: weekRows, error: weekError } = await supabase
    .from("program_weeks")
    .select("*")
    .in("program_id", programIds)
    .order("week_number", { ascending: true })
  assertRead(weekError)

  const weeks = (weekRows ?? []) as Row[]
  const weekIds = weeks.map((week) => week.id)
  const { data: lessonRows, error: lessonError } = weekIds.length
    ? await supabase
        .from("lessons")
        .select("*")
        .in("program_week_id", weekIds)
        .neq("status", "archived")
        .order("sort_order", { ascending: true })
    : { data: [], error: null }
  assertRead(lessonError)

  const { data: itemRows, error: itemError } = await supabase
    .from("program_items")
    .select("*")
    .in("program_id", programIds)
  assertRead(itemError)

  const { data: enrollmentRows, error: enrollmentError } = profile
    ? await supabase
        .from("program_enrollments")
        .select("*")
        .eq("client_id", profile.id)
    : { data: [], error: null }
  assertRead(enrollmentError)

  const visibleLessons = ((lessonRows ?? []) as Row[]).filter((lesson) => (
    !isClient(profile) || clientCanReadStatus(lesson.status)
  ))
  const lessonIds = visibleLessons.map((lesson) => lesson.id)
  const { data: progressRows, error: progressError } = profile && lessonIds.length
    ? await supabase
        .from("lesson_progress")
        .select("lesson_id, completed_at")
        .eq("client_id", profile.id)
        .in("lesson_id", lessonIds)
    : { data: [], error: null }
  assertRead(progressError)

  const weeksByProgram = groupBy(weeks, "program_id")
  const lessonsByWeek = groupBy(visibleLessons, "program_week_id")
  const itemsByProgram = groupBy((itemRows ?? []) as Row[], "program_id")
  const enrollmentsByProgram = new Map(
    ((enrollmentRows ?? []) as Row[]).map((enrollment) => [enrollment.program_id, enrollment])
  )
  const completedLessonIds = new Set(((progressRows ?? []) as Row[]).map((row) => row.lesson_id))

  return programs.map((program) => {
    const enrollment = enrollmentsByProgram.get(program.id)
    const currentWeek = Number(enrollment?.current_week ?? 0)
    const completedAt = enrollment?.completed_at
    const programWeeks = (weeksByProgram.get(program.id) ?? []).map((week) => {
      const state: Program["weeks"][number]["state"] =
        completedAt
          ? "complete"
          : !currentWeek || week.week_number > currentWeek
          ? "locked"
          : week.week_number < currentWeek
            ? "complete"
            : week.week_number === currentWeek
              ? "current"
              : "available"

      return {
        id: week.id,
        weekNumber: week.week_number,
        title: week.title,
        description: week.description ?? "",
        state,
        lessons: (lessonsByWeek.get(week.id) ?? []).map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          body: lesson.body,
          complete: completedLessonIds.has(lesson.id) || state === "complete",
          locked: state === "locked",
        })),
      }
    })

    const items = itemsByProgram.get(program.id) ?? []
    const countType = (type: string) => items.filter((item) => item.item_type === type).length
    const progress = completedAt
      ? 100
      : currentWeek
      ? Math.min(100, Math.round((currentWeek / Number(program.duration_weeks)) * 100))
      : 0

    return {
      id: program.id,
      slug: program.slug,
      title: program.title,
      description: program.description,
      durationWeeks: program.duration_weeks,
      bestFor: program.best_for ?? "Healthy lifestyle",
      status: toStatus(program.status),
      currentWeek: currentWeek || undefined,
      progress,
      counts: {
        weeks: programWeeks.length || Number(program.duration_weeks),
        workouts: countType("workout"),
        recipes: countType("recipe"),
        milestones: countType("goal") + countType("lesson"),
      },
      weeks: programWeeks,
    }
  })
}

export async function getRecipes(profile?: Profile): Promise<Recipe[]> {
  const supabase = await createClient()
  const { data: recipeRows, error: recipeError } = await supabase
    .from("recipes")
    .select("*")
    .neq("status", "archived")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
  assertRead(recipeError)

  const recipes = ((recipeRows ?? []) as Row[]).filter((recipe) => (
    !isClient(profile) || clientCanReadStatus(recipe.status)
  ))
  if (!recipes.length) return []

  const recipeIds = recipes.map((recipe) => recipe.id)
  const { data: ingredientRows, error: ingredientError } = await supabase
    .from("recipe_ingredients")
    .select("*")
    .in("recipe_id", recipeIds)
    .order("sort_order", { ascending: true })
  assertRead(ingredientError)

  const { data: stepRows, error: stepError } = await supabase
    .from("recipe_steps")
    .select("*")
    .in("recipe_id", recipeIds)
    .order("sort_order", { ascending: true })
  assertRead(stepError)

  const { data: saveRows, error: saveError } = profile
    ? await supabase.from("recipe_saves").select("recipe_id").eq("client_id", profile.id)
    : { data: [], error: null }
  assertRead(saveError)

  const ingredientsByRecipe = groupBy((ingredientRows ?? []) as Row[], "recipe_id")
  const stepsByRecipe = groupBy((stepRows ?? []) as Row[], "recipe_id")
  const savedIds = new Set(((saveRows ?? []) as Row[]).map((row) => row.recipe_id))

  return recipes.map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    mealType: recipe.meal_type,
    difficulty: recipe.difficulty,
    servings: recipe.servings,
    prepMinutes: recipe.prep_minutes,
    cookMinutes: recipe.cook_minutes,
    calories: recipe.calories ?? 0,
    protein: recipe.protein ?? 0,
    carbs: recipe.carbs ?? 0,
    fat: recipe.fat ?? 0,
    dietaryTags: recipe.dietary_tags ?? [],
    ingredients: (ingredientsByRecipe.get(recipe.id) ?? []).map((item) =>
      item.quantity ? `${item.quantity} ${item.label}` : item.label
    ),
    steps: (stepsByRecipe.get(recipe.id) ?? []).map((step) => step.body),
    image: recipe.image_url ?? undefined,
    saved: savedIds.has(recipe.id),
  }))
}

export async function getRecipePlanning(
  profile: Profile,
  recipes: Recipe[]
): Promise<{
  mealPlanItems: MealPlanSummary[]
  shoppingListItems: ShoppingListEntry[]
}> {
  const supabase = await createClient()
  const recipesById = byId(recipes)
  const { data: plan, error: planError } = await supabase
    .from("meal_plans")
    .select("*")
    .eq("client_id", profile.id)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle()
  assertRead(planError)

  const { data: planItemRows, error: planItemError } = plan
    ? await supabase
        .from("meal_plan_items")
        .select("*")
        .eq("meal_plan_id", plan.id)
        .order("meal_date", { ascending: true })
        .order("meal_slot", { ascending: true })
    : { data: [], error: null }
  assertRead(planItemError)

  const { data: shoppingRows, error: shoppingError } = await supabase
    .from("shopping_list_items")
    .select("*")
    .eq("client_id", profile.id)
    .order("created_at", { ascending: false })
  assertRead(shoppingError)

  return {
    mealPlanItems: ((planItemRows ?? []) as Row[]).map((item) => {
      const recipe = recipesById.get(item.recipe_id)

      return {
        id: item.id,
        recipeId: item.recipe_id,
        title: recipe?.title ?? "Recipe",
        mealType: recipe?.mealType ?? item.meal_slot,
        mealDate: item.meal_date,
        mealSlot: item.meal_slot,
        calories: recipe?.calories ?? 0,
      }
    }),
    shoppingListItems: ((shoppingRows ?? []) as Row[]).map((item) => ({
      id: item.id,
      label: item.label,
      checked: Boolean(item.checked_at),
      recipeTitle: item.recipe_id ? recipesById.get(item.recipe_id)?.title : undefined,
    })),
  }
}

export async function getWorkouts(profile?: Profile): Promise<Workout[]> {
  const supabase = await createClient()
  const { data: workoutRows, error: workoutError } = await supabase
    .from("workouts")
    .select("*")
    .neq("status", "archived")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
  assertRead(workoutError)

  const workouts = ((workoutRows ?? []) as Row[]).filter((workout) => (
    !isClient(profile) || clientCanReadStatus(workout.status)
  ))
  if (!workouts.length) return []

  const workoutIds = workouts.map((workout) => workout.id)
  const { data: exerciseRows, error: exerciseError } = await supabase
    .from("workout_exercises")
    .select("*")
    .in("workout_id", workoutIds)
    .order("sort_order", { ascending: true })
  assertRead(exerciseError)

  const { data: completionRows, error: completionError } = profile
    ? await supabase
        .from("workout_completions")
        .select("workout_id, exercise_status, completed_at")
        .eq("client_id", profile.id)
        .order("completed_at", { ascending: false })
    : { data: [], error: null }
  assertRead(completionError)

  const exercisesByWorkout = groupBy((exerciseRows ?? []) as Row[], "workout_id")
  const completionsByWorkout = new Map<string, Row>()
  for (const row of (completionRows ?? []) as Row[]) {
    if (!completionsByWorkout.has(row.workout_id)) completionsByWorkout.set(row.workout_id, row)
  }

  return workouts.map((workout) => {
    const completion = completionsByWorkout.get(workout.id)
    const exerciseStatus = (completion?.exercise_status ?? {}) as Record<string, boolean>
    const completedWithoutExerciseState = Boolean(completion) && Object.keys(exerciseStatus).length === 0

    return {
      id: workout.id,
      title: workout.title,
      description: workout.description,
      category: workout.category,
      difficulty: workout.difficulty,
      durationMinutes: workout.duration_minutes,
      caloriesEstimate: workout.calories_estimate ?? 0,
      equipment: workout.equipment ?? [],
      videoUrl: workout.video_url ?? "",
      exercises: (exercisesByWorkout.get(workout.id) ?? []).map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        rest: exercise.rest,
        complete: Boolean(exerciseStatus[exercise.id]) || completedWithoutExerciseState,
      })),
      completed: Boolean(completion),
    }
  })
}

export async function getResources(profile?: Profile): Promise<Resource[]> {
  const supabase = await createClient()
  const { data: resourceRows, error: resourceError } = await supabase
    .from("resources")
    .select("*")
    .neq("status", "archived")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
  assertRead(resourceError)

  const resources = ((resourceRows ?? []) as Row[]).filter((resource) => (
    !isClient(profile) || clientCanReadStatus(resource.status)
  ))
  if (!resources.length) return []

  const { data: readRows, error: readError } = profile
    ? await supabase.from("resource_reads").select("*").eq("client_id", profile.id)
    : { data: [], error: null }
  assertRead(readError)

  const { data: assignmentRows, error: assignmentError } = isClient(profile)
    ? await supabase.from("resource_assignments").select("resource_id")
    : { data: [], error: null }
  assertRead(assignmentError)

  const readsByResource = new Map(((readRows ?? []) as Row[]).map((row) => [row.resource_id, row]))
  const assignedResourceIds = new Set(((assignmentRows ?? []) as Row[]).map((row) => row.resource_id))
  const scopedResources = isClient(profile) && assignedResourceIds.size > 0
    ? resources.filter((resource) => assignedResourceIds.has(resource.id) || resource.featured)
    : resources

  return scopedResources.map((resource) => {
    const read = readsByResource.get(resource.id)
    return {
      id: resource.id,
      title: resource.title,
      summary: resource.summary,
      body: resource.body,
      type: resource.type,
      topic: resource.topic,
      readMinutes: resource.read_minutes,
      tags: resource.tags ?? [],
      url: resource.url ?? "",
      saved: Boolean(read?.saved),
      complete: Boolean(read?.completed_at),
    }
  })
}

export async function getCalendarEvents(profile?: Profile): Promise<CalendarEvent[]> {
  const supabase = await createClient()
  const { data: enrollmentRows, error: enrollmentError } = profile?.role === "client"
    ? await supabase
        .from("program_enrollments")
        .select("program_id")
        .eq("client_id", profile.id)
        .eq("status", "active")
    : { data: [], error: null }
  assertRead(enrollmentError)

  const enrolledProgramIds = new Set(
    ((enrollmentRows ?? []) as Row[]).map((row) => row.program_id)
  )
  const { data: eventRows, error: eventError } = await supabase
    .from("calendar_events")
    .select("*")
    .neq("status", "archived")
    .order("starts_at", { ascending: true })
  assertRead(eventError)

  const scopedEvents = profile?.role === "client"
    ? ((eventRows ?? []) as Row[]).filter((event) => (
        (event.status === "published" || event.status === "scheduled")
        && (
          event.client_id === profile.id
          || (!event.client_id && !event.program_id)
          || (!event.client_id && event.program_id && enrolledProgramIds.has(event.program_id))
        )
      ))
    : ((eventRows ?? []) as Row[])

  return scopedEvents.map((event) => ({
    id: event.id,
    eventType: event.event_type,
    title: event.title,
    description: event.description ?? "",
    startsAt: event.starts_at,
    endsAt: event.ends_at ?? undefined,
    status: eventState(event.starts_at),
    itemType: event.item_type ?? undefined,
    itemId: event.item_id ?? undefined,
    callUrl: event.call_url ?? undefined,
  }))
}

export async function getEventAgenda(eventId: string): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("event_agenda_items")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true })
  assertRead(error)

  return ((data ?? []) as Row[]).map((item) => item.label)
}

export async function getEventResources(eventId: string, profile?: Profile): Promise<Resource[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("event_resources")
    .select("resource_id")
    .eq("event_id", eventId)
  assertRead(error)

  const resourceIds = ((data ?? []) as Row[]).map((row) => row.resource_id)
  if (!resourceIds.length) return []

  const resources = await getResources(profile)
  const resourceIdSet = new Set(resourceIds)
  return resources.filter((resource) => resourceIdSet.has(resource.id))
}

export async function getGoals(profile?: Profile): Promise<Goal[]> {
  const supabase = await createClient()
  const clientProfile = isClient(profile) ? profile : null
  const { data: goalRows, error: goalError } = await supabase
    .from("goals")
    .select("*")
    .neq("status", "archived")
    .order("created_at", { ascending: true })
  assertRead(goalError)

  const goals = ((goalRows ?? []) as Row[]).filter((goal) => (
    !clientProfile
    || (
      clientCanReadStatus(goal.status)
      && (!goal.client_id || goal.client_id === clientProfile.id)
    )
  ))
  if (!goals.length) return []

  const { data: logRows, error: logError } = profile
    ? await supabase
        .from("goal_logs")
        .select("*")
        .eq("client_id", profile.id)
        .gte("log_date", new Date(Date.now() - 6 * 24 * 36e5).toISOString().slice(0, 10))
    : { data: [], error: null }
  assertRead(logError)

  const logsByGoal = groupBy((logRows ?? []) as Row[], "goal_id")
  const colors = ["bg-primary", "bg-amber-500", "bg-blue-700", "bg-emerald-600"]

  return goals.map((goal, index) => ({
    id: goal.id,
    title: goal.title,
    icon: goal.icon,
    description: goal.description,
    targetDays: goal.target_days,
    completedDays: (logsByGoal.get(goal.id) ?? []).filter((log) => log.completed).length,
    metric: goal.metric,
    color: colors[index % colors.length],
  }))
}

export async function getCommunityPosts(): Promise<CommunityPost[]> {
  const supabase = await createClient()
  const { data: topicRows, error: topicError } = await supabase
    .from("community_topics")
    .select("*")
  assertRead(topicError)

  const { data: postRows, error: postError } = await supabase
    .from("community_posts")
    .select("*")
    .is("hidden_at", null)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
  assertRead(postError)

  const posts = (postRows ?? []) as Row[]
  if (!posts.length) return []

  const postIds = posts.map((post) => post.id)
  const authorIds = Array.from(new Set(posts.map((post) => post.author_id).filter(Boolean)))
  const { data: commentRows, error: commentError } = await supabase
    .from("community_comments")
    .select("*")
    .in("post_id", postIds)
    .is("hidden_at", null)
    .order("created_at", { ascending: true })
  assertRead(commentError)

  const commentAuthorIds = ((commentRows ?? []) as Row[]).map((comment) => comment.author_id).filter(Boolean)
  const profileIds = Array.from(new Set([...authorIds, ...commentAuthorIds]))
  const { data: profileRows, error: profileError } = profileIds.length
    ? await supabase.from("profiles").select("id, full_name, email, role").in("id", profileIds)
    : { data: [], error: null }
  assertRead(profileError)

  const { data: reactionRows, error: reactionError } = await supabase
    .from("community_reactions")
    .select("post_id")
    .in("post_id", postIds)
  assertRead(reactionError)

  const topics = byId(((topicRows ?? []) as Row[]).map((topic) => ({ id: topic.id, title: topic.title })))
  const profiles = byId(((profileRows ?? []) as Row[]).map(mapProfile))
  const commentsByPost = groupBy((commentRows ?? []) as Row[], "post_id")
  const reactionsByPost = groupBy((reactionRows ?? []) as Row[], "post_id")

  const commentAuthor = (comment: Row) => {
    if (!comment.author_id) return "Coach"
    return profiles.get(comment.author_id)?.fullName ?? "Member"
  }

  return posts.map((post) => {
    const author = post.author_id ? profiles.get(post.author_id) : undefined
    const replies: CommunityComment[] = (commentsByPost.get(post.id) ?? []).map((comment) => ({
      id: comment.id,
      author: commentAuthor(comment),
      body: comment.body,
      createdAt: relativeDate(comment.created_at),
    }))

    return {
      id: post.id,
      topic: topics.get(post.topic_id)?.title ?? "Discussion",
      author: author?.fullName ?? "Coach",
      authorRole: author?.role ?? "coach",
      title: post.title ?? undefined,
      body: post.body,
      pinned: post.pinned,
      createdAt: relativeDate(post.created_at),
      reactions: reactionsByPost.get(post.id)?.length ?? 0,
      replies,
    }
  })
}

export async function getCommunityTopics(): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("community_topics")
    .select("title")
    .order("sort_order", { ascending: true })
  assertRead(error)

  return ((data ?? []) as Row[]).map((topic) => topic.title)
}

export async function getConversations(profile: Profile): Promise<Conversation[]> {
  const supabase = await createClient()
  const { data: memberRows, error: memberError } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("profile_id", profile.id)
  assertRead(memberError)

  const conversationIds = ((memberRows ?? []) as Row[]).map((member) => member.conversation_id)
  if (!conversationIds.length) return []

  const { data: conversationRows, error: conversationError } = await supabase
    .from("conversations")
    .select("*")
    .in("id", conversationIds)
    .order("updated_at", { ascending: false })
  assertRead(conversationError)

  const { data: allMemberRows, error: allMemberError } = await supabase
    .from("conversation_members")
    .select("*")
    .in("conversation_id", conversationIds)
  assertRead(allMemberError)

  const memberIds = Array.from(new Set(((allMemberRows ?? []) as Row[]).map((member) => member.profile_id)))
  const { data: profileRows, error: profileError } = memberIds.length
    ? await supabase.from("profiles").select("*").in("id", memberIds)
    : { data: [], error: null }
  assertRead(profileError)

  const { data: messageRows, error: messageError } = await supabase
    .from("messages")
    .select("*")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: true })
  assertRead(messageError)

  const profiles = byId(((profileRows ?? []) as Row[]).map(mapProfile))
  const membersByConversation = groupBy((allMemberRows ?? []) as Row[], "conversation_id")
  const messagesByConversation = groupBy((messageRows ?? []) as Row[], "conversation_id")

  return ((conversationRows ?? []) as Row[]).map((conversation) => {
    const members = (membersByConversation.get(conversation.id) ?? [])
      .map((member) => profiles.get(member.profile_id))
      .filter(Boolean) as Profile[]
    const memberMap = byId(members)

    return {
      id: conversation.id,
      title: conversation.title ?? "Coach conversation",
      members,
      messages: (messagesByConversation.get(conversation.id) ?? []).map((message) => {
        const sender = message.sender_id ? memberMap.get(message.sender_id) : undefined
        return {
          id: message.id,
          senderId: message.sender_id ?? "",
          senderName: sender?.fullName ?? "Member",
          body: message.body,
          createdAt: relativeDate(message.created_at),
        }
      }),
    }
  })
}

export async function getCheckIns(profile: Profile, mode: "client" | "coach" = "client"): Promise<CheckIn[]> {
  const supabase = await createClient()
  const query = supabase
    .from("check_ins")
    .select("*")
    .order("submitted_at", { ascending: false })

  let coachClientIds: string[] = []
  if (mode === "coach" && profile.role !== "admin") {
    const { data: linkRows, error: linkError } = await supabase
      .from("coach_clients")
      .select("client_id")
      .eq("coach_id", profile.id)
      .eq("status", "active")
    assertRead(linkError)
    coachClientIds = ((linkRows ?? []) as Row[]).map((link) => link.client_id)
    if (!coachClientIds.length) return []
  }

  const { data: checkInRows, error: checkInError } =
    mode === "client"
      ? await query.eq("client_id", profile.id)
      : profile.role === "admin"
        ? await query
        : await query.in("client_id", coachClientIds)
  assertRead(checkInError)

  const checkIns = (checkInRows ?? []) as Row[]
  if (!checkIns.length) return []

  const clientIds = Array.from(new Set(checkIns.map((checkIn) => checkIn.client_id)))
  const { data: profileRows, error: profileError } = clientIds.length
    ? await supabase.from("profiles").select("*").in("id", clientIds)
    : { data: [], error: null }
  assertRead(profileError)

  const { data: feedbackRows, error: feedbackError } = await supabase
    .from("coach_feedback")
    .select("*")
    .in("check_in_id", checkIns.map((checkIn) => checkIn.id))
    .order("created_at", { ascending: false })
  assertRead(feedbackError)

  const profiles = byId(((profileRows ?? []) as Row[]).map(mapProfile))
  const feedbackByCheckIn = groupBy((feedbackRows ?? []) as Row[], "check_in_id")

  return checkIns.map((checkIn) => ({
    id: checkIn.id,
    clientId: checkIn.client_id,
    clientName: profiles.get(checkIn.client_id)?.fullName ?? profile.fullName,
    mood: checkIn.mood,
    win: checkIn.win,
    challenge: checkIn.challenge,
    supportNeeded: checkIn.support_needed,
    status: checkIn.status,
    submittedAt: relativeDate(checkIn.submitted_at),
    feedback: feedbackByCheckIn.get(checkIn.id)?.[0]?.body,
  }))
}

export async function getNonScaleWins(profile: Profile): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("non_scale_wins")
    .select("body")
    .eq("client_id", profile.id)
    .order("won_at", { ascending: false })
    .limit(6)
  assertRead(error)

  return ((data ?? []) as Row[]).map((row) => row.body)
}

export async function getMetricEntries(profile: Profile): Promise<Row[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("metric_entries")
    .select("*")
    .eq("client_id", profile.id)
    .order("logged_at", { ascending: true })
  assertRead(error)

  return (data ?? []) as Row[]
}

export async function getAdminContentItems(): Promise<AdminContentItem[]> {
  const supabase = await createClient()
  const [workouts, recipes, resources, programs, goals, events] = await Promise.all([
    supabase.from("workouts").select("id, title, description, status, updated_at, created_at").neq("status", "archived"),
    supabase.from("recipes").select("id, title, description, status, updated_at, created_at").neq("status", "archived"),
    supabase.from("resources").select("id, title, summary, body, status, updated_at, created_at").neq("status", "archived"),
    supabase.from("programs").select("id, title, description, status, updated_at, created_at").neq("status", "archived"),
    supabase.from("goals").select("id, title, description, status, updated_at, created_at").neq("status", "archived"),
    supabase
      .from("calendar_events")
      .select("id, title, description, status, updated_at, created_at")
      .eq("event_type", "live_call")
      .neq("status", "archived"),
  ])

  ;[workouts, recipes, resources, programs, goals, events].forEach((result) => assertRead(result.error))

  const mapItem = (type: AdminContentItem["type"], row: Row): AdminContentItem => ({
    id: row.id,
    title: row.title,
    type,
    preview: row.description ?? row.summary ?? row.body ?? undefined,
    assignedTo: type === "Live Call" ? "All active clients" : "Content library",
    status: toStatus(row.status),
    updatedAt: relativeDate(row.updated_at ?? row.created_at),
  })

  return [
    ...((workouts.data ?? []) as Row[]).map((row) => mapItem("Workout", row)),
    ...((recipes.data ?? []) as Row[]).map((row) => mapItem("Recipe", row)),
    ...((events.data ?? []) as Row[]).map((row) => mapItem("Live Call", row)),
    ...((resources.data ?? []) as Row[]).map((row) => mapItem("Resource", row)),
    ...((programs.data ?? []) as Row[]).map((row) => mapItem("Program", row)),
    ...((goals.data ?? []) as Row[]).map((row) => mapItem("Goal", row)),
  ].sort((a, b) => a.title.localeCompare(b.title))
}

export async function getClientRoster(coach: Profile): Promise<ClientRoster> {
  const supabase = await createClient()
  const { data: linkRows, error: linkError } = await supabase
    .from("coach_clients")
    .select("*")
    .eq("coach_id", coach.id)
    .neq("status", "archived")
  assertRead(linkError)

  const clientIds = ((linkRows ?? []) as Row[]).map((link) => link.client_id)
  const { data: profileRows, error: profileError } = clientIds.length
    ? await supabase.from("profiles").select("*").in("id", clientIds)
    : { data: [], error: null }
  assertRead(profileError)

  const { data: invitationRows, error: invitationError } = await supabase
    .from("invitations")
    .select("*")
    .eq("coach_id", coach.id)
    .order("created_at", { ascending: false })
  assertRead(invitationError)

  return {
    clients: ((profileRows ?? []) as Row[]).map(mapProfile),
    invitations: ((invitationRows ?? []) as Row[]).map((invitation) => ({
      id: invitation.id,
      code: invitation.code,
      email: invitation.email ?? "",
      role: invitation.role,
      expiresAt: invitation.expires_at,
      acceptedAt: invitation.accepted_at,
    })),
  }
}

export async function getCoachPublicProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .in("role", ["coach", "admin"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()
  assertRead(error)

  return data ? mapProfile(data as Row) : null
}

export async function getDashboardData(profile: Profile): Promise<{
  events: CalendarEvent[]
  stats: DashboardStats
  goals: Goal[]
  recipes: Recipe[]
  workouts: Workout[]
}> {
  const [events, goals, recipes, workouts, checkIns] = await Promise.all([
    getCalendarEvents(profile),
    getGoals(profile),
    getRecipes(profile),
    getWorkouts(profile),
    getCheckIns(profile),
  ])

  const completedWorkouts = workouts.filter((workout) => workout.completed).length
  const todayEvents = events.filter((event) => event.status !== "complete")
  const weeklyProgress = todayEvents.length
    ? Math.round((events.filter((event) => event.status === "complete").length / events.length) * 100)
    : 0

  return {
    events,
    stats: {
      weeklyProgress,
      workouts: `${completedWorkouts} / ${Math.max(workouts.length, 1)}`,
      nutritionFocus: `${recipes.filter((recipe) => recipe.saved).length} / ${Math.max(recipes.length, 1)}`,
      checkIns: `${checkIns.length} / 3`,
      liveCalls: `${events.filter((event) => event.eventType === "live_call").length} / 1`,
      streakDays: goals.reduce((total, goal) => Math.max(total, goal.completedDays), 0),
    },
    goals,
    recipes,
    workouts,
  }
}
