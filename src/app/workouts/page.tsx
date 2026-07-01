import Link from "next/link"
import { CheckCircle2, Clock, Dumbbell, Play } from "lucide-react"

import { completeWorkoutAction } from "@/lib/actions"
import { getCurrentProfile } from "@/lib/auth"
import { getCalendarEvents, getWorkouts } from "@/lib/data"
import { AppShell } from "@/components/app-shell"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

type WorkoutsPageProps = {
  searchParams?: Promise<{ workout?: string }>
}

function startOfWeek(value: Date) {
  const date = new Date(value)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function WorkoutCard({ workout }: { workout: Awaited<ReturnType<typeof getWorkouts>>[number] }) {
  return (
    <Card>
      <div className="food-band h-28" />
      <CardHeader>
        <Badge className="w-fit">{workout.category}</Badge>
        <CardTitle>{workout.title}</CardTitle>
        <CardDescription>{workout.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="size-4" /> {workout.durationMinutes} min · {workout.difficulty}
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href={`/workouts?workout=${workout.id}`}>View Workout</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export default async function WorkoutsPage({ searchParams }: WorkoutsPageProps) {
  const profile = await getCurrentProfile("client")
  const [workouts, events] = await Promise.all([
    getWorkouts(profile),
    getCalendarEvents(profile),
  ])
  const params = await searchParams
  const workoutsById = new Map(workouts.map((workout) => [workout.id, workout]))
  const weekStart = startOfWeek(new Date())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)
  const assignedWorkoutEvents = events.filter((event) => {
    const startsAt = new Date(event.startsAt)
    return (
      event.eventType === "workout"
      && event.itemId
      && workoutsById.has(event.itemId)
      && startsAt >= weekStart
      && startsAt < weekEnd
    )
  })
  const selected =
    workouts.find((workout) => workout.id === params?.workout)
    ?? (assignedWorkoutEvents[0]?.itemId ? workoutsById.get(assignedWorkoutEvents[0].itemId) : undefined)
    ?? workouts[0]
  const assignedWorkoutIds = new Set(assignedWorkoutEvents.map((event) => event.itemId).filter(Boolean))
  const completedAssignedCount = workouts.filter((workout) => assignedWorkoutIds.has(workout.id) && workout.completed).length
  const completedCount = assignedWorkoutEvents.length ? completedAssignedCount : workouts.filter((workout) => workout.completed).length
  const totalCount = assignedWorkoutEvents.length ? assignedWorkoutEvents.length : workouts.length
  const progressValue = totalCount ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <AppShell profile={profile}>
      <div className="space-y-6 p-4 md:p-6">
        <PageHeader
          title="Workouts"
          description="Complete assigned sessions, track effort, and send notes to your coach."
          actions={<Button asChild variant="outline"><Link href="/dashboard">View Full Calendar</Link></Button>}
        />
        {!selected && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No workouts are published yet. Your coach can add workouts from the admin content area.
            </CardContent>
          </Card>
        )}
        {selected && (
        <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
          <div className="space-y-6">
	            <Card>
	              <CardHeader>
	                <CardTitle>This Week</CardTitle>
	                <CardDescription>
	                  {assignedWorkoutEvents.length
	                    ? `${completedCount} of ${assignedWorkoutEvents.length} assigned workouts completed.`
	                    : "No workouts are assigned for this week yet."}
	                </CardDescription>
	              </CardHeader>
	              <CardContent className="space-y-4">
	                {assignedWorkoutEvents.length > 0 ? (
	                <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
	                  {assignedWorkoutEvents.map((event) => {
	                    const workout = workoutsById.get(event.itemId ?? "")
	                    if (!workout) return null
	                    const startsAt = new Date(event.startsAt)
	                    return (
	                      <Link
	                        key={event.id}
	                        href={`/workouts?workout=${workout.id}`}
	                        className="rounded-md border p-3 text-center transition hover:border-primary data-[active=true]:bg-primary/5"
	                        data-active={workout.id === selected.id}
	                      >
	                        <p className="text-xs text-muted-foreground">
	                          {startsAt.toLocaleDateString("en", { weekday: "short" })} · {startsAt.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })}
	                        </p>
	                        <Dumbbell className="mx-auto my-3 size-5 text-primary" />
	                        <p className="text-sm font-medium">{workout.title}</p>
	                        <p className="text-xs text-muted-foreground">{workout.durationMinutes} min</p>
	                      </Link>
	                    )
	                  })}
	                </div>
	                ) : (
	                  <Card>
	                    <CardContent className="p-4 text-sm text-muted-foreground">
	                      Your coach can assign workout sessions from the admin schedule. The full workout library remains available below.
	                    </CardContent>
	                  </Card>
	                )}
	                <Progress value={progressValue} />
	              </CardContent>
	            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Workout Library</CardTitle>
                <CardDescription>Filter by strength, cardio, or mobility.</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="all">
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="strength">Strength</TabsTrigger>
                    <TabsTrigger value="cardio">Cardio</TabsTrigger>
                    <TabsTrigger value="mobility">Mobility</TabsTrigger>
                  </TabsList>
                  <TabsContent value="all" className="mt-4 grid gap-4 md:grid-cols-3">
                    {workouts.map((workout) => <WorkoutCard key={workout.id} workout={workout} />)}
                  </TabsContent>
                  {["strength", "cardio", "mobility"].map((tab) => (
                    <TabsContent key={tab} value={tab} className="mt-4 grid gap-4 md:grid-cols-3">
                      {workouts
                        .filter((workout) => workout.category.toLowerCase() === tab)
                        .map((workout) => <WorkoutCard key={workout.id} workout={workout} />)}
                      {workouts.filter((workout) => workout.category.toLowerCase() === tab).length === 0 && (
                        <Card className="md:col-span-3">
                          <CardContent className="p-6 text-sm text-muted-foreground">
                            No matching workouts in this training week.
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-3xl">{selected.title}</CardTitle>
                  <CardDescription className="mt-2">{selected.description}</CardDescription>
                </div>
                <Badge variant="secondary">Assigned</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-3 gap-3 text-sm text-muted-foreground">
                <span>{selected.durationMinutes} min</span>
                <span>{selected.difficulty}</span>
                <span>{selected.caloriesEstimate} cal est.</span>
              </div>
              {selected.videoUrl ? (
                <Button asChild className="h-24 w-full text-lg">
                  <a href={selected.videoUrl} target="_blank" rel="noreferrer">
                    <Play className="size-6" />
                    Play Video
                  </a>
                </Button>
              ) : (
                <Card>
                  <CardContent className="p-4 text-sm text-muted-foreground">
                    No workout video is attached yet. Follow the exercise list and coach notes.
                  </CardContent>
                </Card>
              )}
              <form action={completeWorkoutAction} className="space-y-4">
                <input type="hidden" name="workoutId" value={selected.id} />
                <Tabs defaultValue="exercises">
                  <TabsList>
                    <TabsTrigger value="exercises">Exercises</TabsTrigger>
                    <TabsTrigger value="details">Details</TabsTrigger>
                  </TabsList>
                  <TabsContent value="exercises" className="space-y-3 pt-4">
                    {selected.exercises.map((exercise, index) => (
                      <Label key={exercise.id} className="flex items-center gap-4 rounded-md border p-3">
                        <Checkbox name="exercise" value={exercise.id} defaultChecked={exercise.complete} />
                        <span className="w-6 text-muted-foreground">{index + 1}</span>
                        <span className="flex-1 font-medium">{exercise.name}</span>
                        <span className="text-sm text-muted-foreground">{exercise.sets} sets x {exercise.reps}</span>
                      </Label>
                    ))}
                  </TabsContent>
                  <TabsContent value="details" className="pt-4 text-sm text-muted-foreground">
                    Equipment: {selected.equipment.join(", ")}. Keep form controlled and rest as written.
                  </TabsContent>
                </Tabs>
                <div className="space-y-3 rounded-md border p-4">
                  <Label htmlFor="effort">Effort, 1 to 10</Label>
                  <Input id="effort" name="effort" type="number" min="1" max="10" defaultValue="7" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes for Coach</Label>
                  <Textarea id="notes" name="notes" placeholder="How did it go? Any feedback?" />
                </div>
                <Button type="submit" className="w-full">
                  <CheckCircle2 className="size-4" />
                  Complete Workout
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
        )}
      </div>
    </AppShell>
  )
}
