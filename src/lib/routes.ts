import {
  Apple,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Dumbbell,
  HeartHandshake,
  Home,
  Library,
  MessageSquare,
  Settings,
  ShieldCheck,
  Target,
  Users,
  Video,
} from "lucide-react"

export type NavigationItem = {
  title: string
  href: string
  icon: typeof Home
  description: string
}

export const clientNavigation: NavigationItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
    description: "Today, weekly plan, calls, workouts, and check-ins.",
  },
  {
    title: "Programs",
    href: "/programs",
    icon: BookOpen,
    description: "Current coaching program, modules, and milestones.",
  },
  {
    title: "Recipes",
    href: "/recipes",
    icon: Apple,
    description: "Recipe library, meal plan, and shopping list.",
  },
  {
    title: "Workouts",
    href: "/workouts",
    icon: Dumbbell,
    description: "Assigned workouts, exercise lists, and completions.",
  },
  {
    title: "Live Calls",
    href: "/live-calls",
    icon: Video,
    description: "Upcoming calls, RSVP, reminders, and replays.",
  },
  {
    title: "Goals",
    href: "/goals",
    icon: Target,
    description: "Goals, habits, metrics, and progress.",
  },
  {
    title: "Community",
    href: "/community",
    icon: Users,
    description: "Private discussion, wins, questions, and support.",
  },
  {
    title: "Resources",
    href: "/resources",
    icon: Library,
    description: "Articles, PDFs, worksheets, videos, and downloads.",
  },
  {
    title: "Messages",
    href: "/messages",
    icon: MessageSquare,
    description: "Coach conversations and check-in follow-ups.",
  },
  {
    title: "Profile",
    href: "/profile",
    icon: HeartHandshake,
    description: "Personal preferences, plan status, and coach info.",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Notifications, password reset, and account safety.",
  },
]

export const adminNavigation: NavigationItem[] = [
  {
    title: "Admin",
    href: "/admin",
    icon: ShieldCheck,
    description: "Coach command center and quick actions.",
  },
  {
    title: "Clients",
    href: "/admin/clients",
    icon: Users,
    description: "Client roster, progress, notes, messages, and assignments.",
  },
  {
    title: "Content",
    href: "/admin/content",
    icon: Library,
    description: "Programs, workouts, recipes, calls, resources, and goals.",
  },
  {
    title: "Schedule",
    href: "/admin/schedule",
    icon: CalendarDays,
    description: "Weekly schedule builder and content assignment.",
  },
  {
    title: "Check-ins",
    href: "/admin/check-ins",
    icon: CheckCircle2,
    description: "Pending check-ins, coach feedback, and resolution queue.",
  },
  {
    title: "Community",
    href: "/admin/community",
    icon: Users,
    description: "Announcements, moderation, topics, and reports.",
  },
  {
    title: "Messages",
    href: "/admin/messages",
    icon: MessageSquare,
    description: "Coach messages, client follow-ups, and accountability replies.",
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: BarChart3,
    description: "Coach profile, notifications, and program defaults.",
  },
]

export const routeGroups = {
  public: ["/", "/auth", "/auth/callback", "/auth/update-password"],
  client: clientNavigation.map((item) => item.href),
  admin: adminNavigation.map((item) => item.href),
} as const

export const primaryActionLabels = {
  dashboard: [
    "Today",
    "Previous week",
    "Next week",
    "View Workout",
    "View Meal Plan",
    "Join Call",
    "Start Check-in",
    "View full day",
  ],
  programs: [
    "Next Lesson",
    "View Lesson",
    "View Program",
    "View Recipe",
    "View Workout",
  ],
  recipes: [
    "Search",
    "Filter",
    "Save",
    "Add to Meal Plan",
    "Add to Shopping List",
    "View Full Meal Plan",
    "Go to Shopping List",
  ],
  workouts: [
    "View Workout",
    "Play Video",
    "Complete Exercise",
    "Complete Workout",
    "Save Effort",
  ],
  liveCalls: [
    "Join Call",
    "Add to Calendar",
    "Update RSVP",
    "Enable Reminder",
    "Play Replay",
    "Download Resource",
  ],
  goals: [
    "Update Goal",
    "Save Goal",
    "Toggle Habit",
    "Add Metric",
    "Send Message",
  ],
  community: [
    "New Post",
    "Post",
    "React",
    "Reply",
    "Report",
  ],
  resources: [
    "Search",
    "Filter",
    "Open Resource",
    "Download",
    "Save",
    "Mark Complete",
  ],
  user: [
    "Save Profile",
    "Save Notifications",
    "Request Password Reset",
    "Send Message",
    "Sign Out",
  ],
  admin: [
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
  ],
} as const

export const allProtectedRoutes = [
  ...routeGroups.client,
  ...routeGroups.admin,
]
