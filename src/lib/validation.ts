import { z } from "zod"

const nonEmptyString = z.string().trim().min(1, "Required")
const statusSchema = z.enum(["draft", "published", "scheduled", "archived"])

export const onboardingSchema = z.object({
  fullName: nonEmptyString,
  primaryGoal: nonEmptyString,
  foodSupport: z.array(nonEmptyString).min(1, "Choose at least one support area"),
  fitnessLevel: z.enum(["Beginner", "Intermediate", "Advanced"]),
  dietaryPreferences: z.array(nonEmptyString).min(1, "Choose at least one preference"),
  availabilityDays: nonEmptyString,
  availabilityTime: nonEmptyString,
  sessionLength: nonEmptyString,
  programId: nonEmptyString,
  disclaimerAccepted: z.literal(true, {
    error: "The health disclaimer must be acknowledged",
  }),
})

export const profileSchema = z.object({
  fullName: nonEmptyString,
  timezone: nonEmptyString,
  notificationEmail: z.boolean(),
  notificationSms: z.boolean(),
  dietaryPreferences: z.array(nonEmptyString),
  availability: nonEmptyString,
})

export const messageSchema = z.object({
  conversationId: nonEmptyString,
  body: z.string().trim().min(2, "Message is too short").max(2000),
})

export const checkInSchema = z.object({
  mood: nonEmptyString,
  win: z.string().trim().min(2, "Share at least one win"),
  challenge: z.string().trim().min(2, "Share one challenge or write none"),
  supportNeeded: z.string().trim().min(2, "Tell your coach what support would help"),
})

export const metricEntrySchema = z.object({
  metric: nonEmptyString,
  value: z.coerce.number().nonnegative(),
  unit: z.string().trim().max(24).optional(),
  note: z.string().trim().max(240).optional(),
})

export const adminRecipeSchema = z.object({
  title: nonEmptyString,
  mealType: nonEmptyString,
  ingredients: z.array(nonEmptyString).min(1, "Add at least one ingredient"),
  steps: z.array(nonEmptyString).min(1, "Add at least one step"),
  servings: z.coerce.number().int().positive(),
  prepMinutes: z.coerce.number().int().nonnegative(),
  status: statusSchema,
  protein: z.coerce.number().int().nonnegative().optional(),
  carbs: z.coerce.number().int().nonnegative().optional(),
  fat: z.coerce.number().int().nonnegative().optional(),
  calories: z.coerce.number().int().nonnegative().optional(),
  dietaryTags: z.array(nonEmptyString).default([]),
})

export const adminWorkoutSchema = z.object({
  title: nonEmptyString,
  durationMinutes: z.coerce.number().int().positive(),
  difficulty: nonEmptyString,
  category: nonEmptyString,
  exercises: z
    .array(
      z.object({
        name: nonEmptyString,
        sets: z.coerce.number().int().positive(),
        reps: nonEmptyString,
        rest: nonEmptyString,
      })
    )
    .min(1, "Add at least one exercise"),
  status: statusSchema,
  videoUrl: z.string().url().optional().or(z.literal("")),
})

export const adminLiveCallSchema = z.object({
  title: nonEmptyString,
  startsAt: nonEmptyString,
  durationMinutes: z.coerce.number().int().positive(),
  callUrl: z.string().url("Add a valid call link"),
  timezone: nonEmptyString,
  agenda: z.array(nonEmptyString).min(1, "Add at least one agenda item"),
  status: statusSchema,
  targetSelection: z.string().trim().optional(),
})

export const adminResourceSchema = z.object({
  title: nonEmptyString,
  type: z.enum(["article", "pdf", "video", "link", "worksheet"]),
  summary: z.string().trim().min(8, "Summary is too short"),
  content: z.string().trim().min(8, "Content or link is required"),
  status: statusSchema,
  topic: nonEmptyString,
})

export const adminGoalSchema = z.object({
  title: nonEmptyString,
  description: z.string().trim().min(8),
  targetDays: z.coerce.number().int().min(1).max(7),
  metric: nonEmptyString,
  status: statusSchema,
})

export const adminProgramSchema = z.object({
  title: nonEmptyString,
  description: z.string().trim().min(8),
  durationWeeks: z.coerce.number().int().min(1).max(52),
  bestFor: z.string().trim().min(4),
  status: statusSchema,
})

export const adminScheduleSchema = z.object({
  title: nonEmptyString,
  description: z.string().trim().min(4),
  eventType: z.enum(["workout", "meal", "live_call", "check_in", "resource", "custom"]),
  startsAt: nonEmptyString,
  durationMinutes: z.coerce.number().int().positive(),
  callUrl: z.string().url().optional().or(z.literal("")),
  required: z.boolean(),
  targetSelection: z.string().trim().optional(),
  itemSelection: z.string().trim().optional(),
})

export const adminSettingsSchema = z.object({
  fullName: nonEmptyString,
  bio: z.string().trim().min(8),
  timezone: nonEmptyString,
  availability: nonEmptyString,
  defaultProgramId: z.string().trim().optional(),
  dietaryPreferences: z.array(nonEmptyString).optional(),
  notificationEmail: z.boolean().optional(),
  notificationSms: z.boolean().optional(),
  notificationCalls: z.boolean().optional(),
  notificationCommunity: z.boolean().optional(),
})

export const communityPostSchema = z.object({
  topic: nonEmptyString,
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(2, "Post cannot be empty").max(3000),
  pinned: z.boolean().default(false),
})

export type OnboardingInput = z.infer<typeof onboardingSchema>
export type ProfileInput = z.infer<typeof profileSchema>
