"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  Apple,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  MessageSquareText,
  MoreVertical,
  Video,
} from "lucide-react"

import { submitCheckInAction } from "@/lib/actions"
import type { CalendarEvent, Goal, Profile, Recipe, Workout } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"

type DashboardClientProps = {
  profile: Profile
  events: CalendarEvent[]
  stats: {
    weeklyProgress: number
    workouts: string
    nutritionFocus: string
    checkIns: string
    liveCalls: string
    streakDays: number
  }
  goals: Goal[]
  recipes: Recipe[]
  workouts: Workout[]
}

const eventStyles = {
  workout: { icon: Dumbbell, label: "Workout", dot: "bg-blue-500" },
  meal: { icon: Apple, label: "Meal Focus", dot: "bg-amber-500" },
  live_call: { icon: Video, label: "Live Call", dot: "bg-primary" },
  check_in: { icon: CheckCircle2, label: "Check-in", dot: "bg-muted-foreground" },
  resource: { icon: MessageSquareText, label: "Resource", dot: "bg-blue-800" },
  custom: { icon: CalendarDays, label: "Event", dot: "bg-orange-500" },
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

function buildWeek(weekOffset: number) {
  const base = new Date()
  base.setDate(base.getDate() + weekOffset * 7)
  const start = new Date(base)
  start.setDate(base.getDate() - base.getDay())
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })
}

function TodayCard({
  event,
  recipes,
  workouts,
}: {
  event: CalendarEvent
  recipes: Recipe[]
  workouts: Workout[]
}) {
  const style = eventStyles[event.eventType]
  const Icon = style.icon
  const workout = workouts.find((item) => item.id === event.itemId)
  const recipe = recipes.find((item) => item.id === event.itemId)
  const actionType = event.itemType ?? event.eventType

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <Badge variant="secondary" className="gap-1">
            <Icon className="size-3.5" />
            {style.label}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="size-4" />
                <span className="sr-only">More actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/messages">Message coach</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">Notification settings</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div>
          <CardTitle>{event.title}</CardTitle>
          <CardDescription className="mt-2">{event.description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="size-4" />
          {formatTime(event.startsAt)}
          {event.endsAt ? ` - ${formatTime(event.endsAt)}` : null}
        </div>
        {actionType === "workout" && workout && (
          <Button asChild variant="outline" className="w-full">
            <Link href={`/workouts?workout=${workout.id}`}>View Workout</Link>
          </Button>
        )}
        {(actionType === "recipe" || event.eventType === "meal") && recipe && (
          <Button asChild variant="outline" className="w-full">
            <Link href={`/recipes?recipe=${recipe.id}`}>View Meal Plan</Link>
          </Button>
        )}
        {actionType === "resource" && event.itemId && (
          <Button asChild variant="outline" className="w-full">
            <Link href={`/resources?resource=${event.itemId}`}>Open Resource</Link>
          </Button>
        )}
        {actionType === "program" && event.itemId && (
          <Button asChild variant="outline" className="w-full">
            <Link href={`/programs?program=${event.itemId}`}>Open Program</Link>
          </Button>
        )}
        {actionType === "goal" && event.itemId && (
          <Button asChild variant="outline" className="w-full">
            <Link href={`/goals?goal=${event.itemId}`}>Open Goal</Link>
          </Button>
        )}
        {event.eventType === "live_call" && event.callUrl && (
          <Button asChild className="w-full">
            <a href={event.callUrl} target="_blank" rel="noreferrer">
              Join Call
            </a>
          </Button>
        )}
        {event.eventType === "live_call" && !event.callUrl && (
          <Button asChild variant="outline" className="w-full">
            <Link href="/live-calls">Open Live Calls</Link>
          </Button>
        )}
        {event.eventType === "check_in" && (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full">Start Check-in</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Accountability Check-in</DialogTitle>
                <DialogDescription>
                  Share what happened this week so your coach can support you.
                </DialogDescription>
              </DialogHeader>
              <form action={submitCheckInAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mood">Mood</Label>
                  <Input id="mood" name="mood" defaultValue="Focused" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="win">Win</Label>
                  <Textarea id="win" name="win" defaultValue="I followed my meal rhythm most days." required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="challenge">Challenge</Label>
                  <Textarea id="challenge" name="challenge" defaultValue="Late meetings made dinners harder." required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supportNeeded">Support needed</Label>
                  <Textarea id="supportNeeded" name="supportNeeded" defaultValue="I need two faster dinner options." required />
                </div>
                <Button type="submit" className="w-full">Submit Check-in</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  )
}

export function DashboardClient({
  profile,
  events,
  stats,
  goals,
  recipes,
  workouts,
}: DashboardClientProps) {
  const [weekOffset, setWeekOffset] = useState(0)
  const todayKey = new Date().toISOString().slice(0, 10)
  const [selectedDay, setSelectedDay] = useState(todayKey)
  const week = useMemo(() => buildWeek(weekOffset), [weekOffset])
  const selectedEvents = events.filter((event) => event.startsAt.slice(0, 10) === selectedDay)
  const selectedDate = new Date(`${selectedDay}T12:00:00`)
  const weekLabel = `${week[0].toLocaleDateString("en", { month: "short", day: "numeric" })} - ${week[6].toLocaleDateString("en", { month: "short", day: "numeric" })}`
  const moveToWeek = (nextOffset: number) => {
    const nextWeek = buildWeek(nextOffset)
    setWeekOffset(nextOffset)
    setSelectedDay(nextWeek[0].toISOString().slice(0, 10))
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome back, {profile.fullName.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground">
          Small steps, big changes. Here is what matters today.
        </p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>This Week</CardTitle>
                <CardDescription>Calls, workouts, meals, and check-ins in one line.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setWeekOffset(0)
                    setSelectedDay(todayKey)
                  }}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Previous week"
                  onClick={() => moveToWeek(weekOffset - 1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Next week"
                  onClick={() => moveToWeek(weekOffset + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid overflow-hidden rounded-md border md:grid-cols-7">
                {week.map((date) => {
                  const key = date.toISOString().slice(0, 10)
                  const dayEvents = events.filter((event) => event.startsAt.slice(0, 10) === key)
                  const selected = key === selectedDay
                  return (
                    <Button
                      type="button"
                      key={key}
                      variant="ghost"
                      onClick={() => setSelectedDay(key)}
                      className="h-auto min-h-32 flex-col items-start justify-start rounded-none border-b p-3 text-left transition last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0 data-[selected=true]:bg-primary/5"
                      data-selected={selected}
                    >
                      <div className="text-xs font-medium uppercase text-muted-foreground">
                        {date.toLocaleDateString("en", { weekday: "short" })}
                      </div>
                      <div className="text-sm">{date.toLocaleDateString("en", { month: "short", day: "numeric" })}</div>
                      <div className="mt-4 space-y-2">
                        {dayEvents.map((event) => (
                          <div key={event.id} className="flex gap-2 text-xs">
                            <span className={`mt-1.5 size-2 rounded-full ${eventStyles[event.eventType].dot}`} />
                            <span>
                              <span className="block font-medium">{event.title}</span>
                              <span className="text-muted-foreground">{formatTime(event.startsAt)}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </Button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-semibold tracking-tight">
                {selectedDay === todayKey ? "Today" : selectedDate.toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" })}
              </h2>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline">View full day</Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-md">
                  <SheetHeader>
                    <SheetTitle>Today&apos;s schedule</SheetTitle>
                    <SheetDescription>All events and required actions.</SheetDescription>
                  </SheetHeader>
                  <div className="mt-6 space-y-3">
                    {selectedEvents.map((event) => (
                      <Card key={event.id}>
                        <CardContent className="flex items-center justify-between gap-4 p-4">
                          <div>
                            <p className="font-medium">{event.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatTime(event.startsAt)} · {eventStyles[event.eventType].label}
                            </p>
                          </div>
                          <Badge variant="secondary">{event.status}</Badge>
                        </CardContent>
                      </Card>
                    ))}
                    {selectedEvents.length === 0 && (
                      <Card>
                        <CardContent className="p-4 text-sm text-muted-foreground">
                          No assigned events for this day.
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {selectedEvents.map((event) => (
                <TodayCard key={event.id} event={event} recipes={recipes} workouts={workouts} />
              ))}
              {selectedEvents.length === 0 && (
                <Card className="md:col-span-2 xl:col-span-4">
                  <CardContent className="p-6 text-sm text-muted-foreground">
                    No assigned events for this day. Use the calendar controls to return to today&apos;s plan.
                  </CardContent>
                </Card>
              )}
            </div>
          </section>
          <Card className="food-band">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex size-14 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <LeafIcon />
              </div>
              <div>
                <p className="font-medium">Daily Motivation</p>
                <p className="brand-serif text-lg text-muted-foreground">
                  You do not have to be perfect. You just have to be consistent.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Progress</CardTitle>
              <CardDescription>Workout, nutrition, check-in, and calls.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end justify-between">
                <span className="text-4xl font-semibold text-primary">{stats.weeklyProgress}%</span>
                <span className="text-sm text-muted-foreground">{weekLabel}</span>
              </div>
              <Progress value={stats.weeklyProgress} />
              {[
                ["Workouts", stats.workouts],
                ["Nutrition Focus", stats.nutritionFocus],
                ["Check-ins", stats.checkIns],
                ["Live Calls", stats.liveCalls],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span>{label}</span>
                  <span className="text-muted-foreground">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="size-5 text-amber-500" />
                Current Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-semibold text-amber-600">{stats.streakDays} days</p>
              <p className="mt-1 text-sm text-muted-foreground">Keep showing up for you.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Starter Goals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {goals.map((goal) => (
                <div key={goal.id} className="space-y-2">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="font-medium">{goal.title}</span>
                    <span className="text-muted-foreground">{goal.completedDays}/{goal.targetDays}</span>
                  </div>
                  <Progress value={(goal.completedDays / goal.targetDays) * 100} />
                </div>
              ))}
              <Button asChild variant="outline" className="w-full">
                <Link href="/goals">Update Goals</Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

function LeafIcon() {
  return <CheckCircle2 className="size-6" />
}
