import { describe, expect, it } from "vitest"

import {
  adminNavigation,
  clientNavigation,
  primaryActionLabels,
  routeGroups,
} from "./routes"

describe("route contract", () => {
  it("contains every client-facing page required by the product", () => {
    expect(clientNavigation.map((item) => item.href)).toEqual([
      "/dashboard",
      "/programs",
      "/recipes",
      "/workouts",
      "/live-calls",
      "/goals",
      "/community",
      "/resources",
      "/messages",
      "/profile",
      "/settings",
    ])
  })

  it("contains every coach-admin page required by the product", () => {
    expect(adminNavigation.map((item) => item.href)).toEqual([
      "/admin",
      "/admin/clients",
      "/admin/content",
      "/admin/schedule",
      "/admin/check-ins",
      "/admin/community",
      "/admin/messages",
      "/admin/settings",
    ])
  })

  it("keeps protected and public route groups explicit", () => {
    expect(routeGroups.public).toEqual(["/", "/auth", "/auth/callback", "/auth/update-password"])
    expect(routeGroups.client).toContain("/dashboard")
    expect(routeGroups.admin).toContain("/admin/content")
  })
})

describe("primary action contract", () => {
  it("declares dashboard actions that must not be rendered as dead buttons", () => {
    expect(primaryActionLabels.dashboard).toEqual([
      "Today",
      "Previous week",
      "Next week",
      "View Workout",
      "View Meal Plan",
      "Join Call",
      "Start Check-in",
      "View full day",
    ])
  })

  it("declares client page actions that must have backed behavior", () => {
    expect(primaryActionLabels.recipes).toContain("Add to Meal Plan")
    expect(primaryActionLabels.workouts).toContain("Complete Workout")
    expect(primaryActionLabels.liveCalls).toContain("Update RSVP")
    expect(primaryActionLabels.goals).toContain("Save Goal")
    expect(primaryActionLabels.community).toContain("Post")
    expect(primaryActionLabels.resources).toContain("Mark Complete")
  })

  it("declares coach admin creation and lifecycle actions", () => {
    expect(primaryActionLabels.admin).toEqual([
      "Add Client",
      "Add Workout",
      "Add Recipe",
      "Add Live Call",
      "Add Resource",
      "Add Goal",
      "Add Program",
      "Edit",
      "Duplicate",
      "Preview",
      "Archive",
      "Assign",
      "Reply to Check-in",
      "Pin Announcement",
    ])
  })
})
