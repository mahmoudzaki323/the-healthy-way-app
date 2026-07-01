import { describe, expect, it } from "vitest"

import {
  adminRecipeSchema,
  adminWorkoutSchema,
  metricEntrySchema,
  onboardingSchema,
  profileSchema,
} from "./validation"

describe("onboarding validation", () => {
  it("requires the health disclaimer before onboarding can complete", () => {
    const result = onboardingSchema.safeParse({
      fullName: "Sarah Johnson",
      primaryGoal: "Improve Health",
      foodSupport: ["Mindful eating"],
      fitnessLevel: "Beginner",
      dietaryPreferences: ["No restrictions"],
      availabilityDays: "3-5 days",
      availabilityTime: "Morning",
      sessionLength: "30-45 minutes",
      programId: "fit-fueled",
      disclaimerAccepted: false,
    })

    expect(result.success).toBe(false)
  })

  it("accepts a complete client onboarding intake", () => {
    const result = onboardingSchema.safeParse({
      fullName: "Sarah Johnson",
      primaryGoal: "Increase Energy",
      foodSupport: ["Emotional eating", "Meal planning"],
      fitnessLevel: "Intermediate",
      dietaryPreferences: ["Gluten-free"],
      availabilityDays: "3-5 days",
      availabilityTime: "Morning",
      sessionLength: "30-45 minutes",
      programId: "fit-fueled",
      disclaimerAccepted: true,
    })

    expect(result.success).toBe(true)
  })
})

describe("coach content validation", () => {
  it("requires ingredients and steps for recipes", () => {
    const result = adminRecipeSchema.safeParse({
      title: "Protein Bowl",
      mealType: "Lunch",
      ingredients: [],
      steps: [],
      servings: 2,
      prepMinutes: 15,
      status: "published",
    })

    expect(result.success).toBe(false)
  })

  it("requires at least one exercise for workouts", () => {
    const result = adminWorkoutSchema.safeParse({
      title: "Lower Body Strength",
      durationMinutes: 45,
      difficulty: "Intermediate",
      category: "Strength",
      exercises: [],
      status: "published",
    })

    expect(result.success).toBe(false)
  })
})

describe("profile validation", () => {
  it("keeps basic profile settings complete", () => {
    const result = profileSchema.safeParse({
      fullName: "Shahinaz El Tarouty",
      timezone: "America/Los_Angeles",
      notificationEmail: true,
      notificationSms: false,
      dietaryPreferences: ["No restrictions"],
      availability: "Weekday mornings",
    })

    expect(result.success).toBe(true)
  })
})

describe("metric validation", () => {
  it("accepts a simple client metric entry", () => {
    const result = metricEntrySchema.safeParse({
      metric: "Energy",
      value: "7",
      unit: "/10",
      note: "Felt steady through the afternoon.",
    })

    expect(result.success).toBe(true)
  })
})
