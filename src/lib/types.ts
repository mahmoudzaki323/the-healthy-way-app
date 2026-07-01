export type AppRole = "client" | "coach" | "admin"
export type ContentStatus = "draft" | "published" | "scheduled" | "archived"
export type EventType = "workout" | "meal" | "live_call" | "check_in" | "resource" | "custom"

export type Profile = {
  id: string
  email: string
  fullName: string
  role: AppRole
  avatarUrl?: string
  timezone: string
  bio?: string
  dietaryPreferences: string[]
  availability: string
  notificationPreferences: {
    email: boolean
    sms: boolean
    push: boolean
    calls: boolean
    community: boolean
    defaultProgramId?: string
  }
}

export type Program = {
  id: string
  slug: string
  title: string
  description: string
  durationWeeks: number
  bestFor: string
  status: ContentStatus
  currentWeek?: number
  progress: number
  counts: {
    weeks: number
    workouts: number
    recipes: number
    milestones: number
  }
  weeks: ProgramWeek[]
}

export type ProgramWeek = {
  id: string
  weekNumber: number
  title: string
  description: string
  state: "locked" | "complete" | "current" | "available"
  lessons: Lesson[]
}

export type Lesson = {
  id: string
  title: string
  body: string
  complete: boolean
  locked: boolean
}

export type Recipe = {
  id: string
  title: string
  description: string
  mealType: string
  difficulty: string
  servings: number
  prepMinutes: number
  cookMinutes: number
  calories: number
  protein: number
  carbs: number
  fat: number
  dietaryTags: string[]
  ingredients: string[]
  steps: string[]
  image?: string
  saved: boolean
}

export type Workout = {
  id: string
  title: string
  description: string
  category: string
  difficulty: string
  durationMinutes: number
  caloriesEstimate: number
  equipment: string[]
  videoUrl: string
  exercises: WorkoutExercise[]
  completed: boolean
}

export type WorkoutExercise = {
  id: string
  name: string
  sets: number
  reps: string
  rest: string
  complete?: boolean
}

export type CalendarEvent = {
  id: string
  eventType: EventType
  title: string
  description: string
  startsAt: string
  endsAt?: string
  status: "upcoming" | "later" | "complete"
  itemType?: string
  itemId?: string
  callUrl?: string
}

export type Goal = {
  id: string
  title: string
  icon: string
  description: string
  targetDays: number
  completedDays: number
  metric: string
  color: string
}

export type CommunityPost = {
  id: string
  topic: string
  author: string
  authorRole: AppRole
  title?: string
  body: string
  pinned: boolean
  createdAt: string
  reactions: number
  replies: CommunityComment[]
}

export type CommunityComment = {
  id: string
  author: string
  body: string
  createdAt: string
}

export type Resource = {
  id: string
  title: string
  summary: string
  body: string
  type: "article" | "pdf" | "video" | "link" | "worksheet"
  topic: string
  readMinutes: number
  tags: string[]
  url: string
  saved: boolean
  complete: boolean
}

export type Message = {
  id: string
  senderId: string
  senderName: string
  body: string
  createdAt: string
}

export type Conversation = {
  id: string
  title: string
  members: Profile[]
  messages: Message[]
}

export type CheckIn = {
  id: string
  clientId: string
  clientName: string
  mood: string
  win: string
  challenge: string
  supportNeeded: string
  status: "pending" | "reviewed" | "resolved"
  submittedAt: string
  feedback?: string
}

export type AdminContentItem = {
  id: string
  title: string
  type: "Workout" | "Recipe" | "Live Call" | "Resource" | "Program" | "Goal"
  preview?: string
  assignedTo: string
  status: ContentStatus
  updatedAt: string
}
