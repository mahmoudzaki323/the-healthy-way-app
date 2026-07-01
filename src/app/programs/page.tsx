import Link from "next/link"
import { BookOpen, CheckCircle2, Lock, PlayCircle } from "lucide-react"

import { completeLessonAction } from "@/lib/actions"
import { AppShell } from "@/components/app-shell"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getCurrentProfile } from "@/lib/auth"
import { getPrograms } from "@/lib/data"

type ProgramsPageProps = {
  searchParams?: Promise<{ lesson?: string; program?: string }>
}

export default async function ProgramsPage({ searchParams }: ProgramsPageProps) {
  const profile = await getCurrentProfile("client")
  const programs = await getPrograms(profile)
  const enrolledPrograms = programs.filter((program) => program.currentWeek)
  const current = enrolledPrograms[0]
  const params = await searchParams
  const selectedLesson = current?.weeks
    .flatMap((week) => week.lessons.map((lesson) => ({ ...lesson, weekTitle: week.title, weekNumber: week.weekNumber })))
    .find((lesson) => lesson.id === params?.lesson)
  const selectedProgram = programs.find((program) => program.slug === params?.program || program.id === params?.program)
  const completedPrograms = enrolledPrograms.filter((program) => program.progress >= 100)

  return (
    <AppShell profile={profile}>
      <div className="space-y-6 p-4 md:p-6">
        <PageHeader
          title="Programs"
          description="Follow your coaching path, lessons, milestones, recipes, and workouts."
        />
        {programs.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No published programs are available yet. Your coach can publish one from the admin content area.
            </CardContent>
          </Card>
        )}
        {(selectedLesson || selectedProgram) && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <Badge className="mb-2 w-fit">
                  {selectedLesson ? "Selected lesson" : "Selected program"}
                </Badge>
                <p className="font-medium">
                  {selectedLesson ? selectedLesson.title : selectedProgram?.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedLesson
                    ? `Week ${selectedLesson.weekNumber}: ${selectedLesson.weekTitle}. ${selectedLesson.body}`
                    : selectedProgram?.description}
                </p>
              </div>
	              <div className="flex flex-wrap gap-2">
	                {selectedLesson && !selectedLesson.complete && !selectedLesson.locked && (
	                  <form action={completeLessonAction}>
	                    <input type="hidden" name="lessonId" value={selectedLesson.id} />
	                    <Button type="submit" size="sm">Mark Lesson Complete</Button>
	                  </form>
	                )}
	                <Button asChild variant="outline" size="sm"><Link href="/recipes">View Recipes</Link></Button>
	                <Button asChild variant="outline" size="sm"><Link href="/workouts">View Workouts</Link></Button>
	                <Button asChild size="sm"><Link href="/programs">Back to Program</Link></Button>
              </div>
            </CardContent>
          </Card>
        )}
        <Tabs defaultValue="my-program">
          <TabsList>
            <TabsTrigger value="my-program">My Program</TabsTrigger>
            <TabsTrigger value="all">All Programs</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          <TabsContent value="my-program" className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            {current && (
              <>
            <Card>
              <CardHeader className="food-band min-h-44 justify-end text-white">
                <Badge className="w-fit bg-primary text-primary-foreground">Enrolled</Badge>
                <CardTitle className="brand-serif text-4xl text-white">{current.title}</CardTitle>
                <CardDescription className="text-white/90">{current.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 p-6">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Week {current.currentWeek} of {current.durationWeeks}</span>
                  <span className="text-sm text-muted-foreground">{current.progress}%</span>
                </div>
                <Progress value={current.progress} />
                <div className="grid grid-cols-4 gap-3 rounded-md border p-4 text-center text-sm">
                  <div><b>{current.counts.weeks}</b><span className="block text-muted-foreground">Weeks</span></div>
                  <div><b>{current.counts.workouts}</b><span className="block text-muted-foreground">Workouts</span></div>
                  <div><b>{current.counts.recipes}</b><span className="block text-muted-foreground">Recipes</span></div>
                  <div><b>{current.counts.milestones}</b><span className="block text-muted-foreground">Milestones</span></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Modules</CardTitle>
                <CardDescription>Complete the current week and unlock what is next.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {current.weeks.map((week) => (
                  <div key={week.id} className="rounded-md border">
                    <div className="flex items-center justify-between gap-4 border-b p-4">
                      <div className="flex items-center gap-3">
                        {week.state === "complete" ? (
                          <CheckCircle2 className="size-5 text-primary" />
                        ) : week.state === "locked" ? (
                          <Lock className="size-5 text-muted-foreground" />
                        ) : (
                          <BookOpen className="size-5 text-primary" />
                        )}
                        <div>
                          <p className="font-medium">Week {week.weekNumber}: {week.title}</p>
                          <p className="text-sm text-muted-foreground">{week.description}</p>
                        </div>
                      </div>
                      <Badge variant={week.state === "current" ? "default" : "secondary"}>{week.state}</Badge>
                    </div>
                    {week.lessons.length > 0 && (
                      <div className="space-y-2 p-3">
                        {week.lessons.map((lesson, index) => (
                          <div key={lesson.id} className="flex items-center justify-between gap-3 rounded-md bg-muted/40 p-3">
                            <div className="flex items-center gap-3">
                              {lesson.locked ? <Lock className="size-4" /> : <PlayCircle className="size-4 text-primary" />}
                              <span>Lesson {index + 1}: {lesson.title}</span>
                            </div>
                            {!lesson.locked && (
                              <Button asChild size="sm">
                                <Link href={`/programs?lesson=${lesson.id}`}>
                                  {lesson.complete ? "Review" : "Next Lesson"}
                                </Link>
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
              </>
            )}
            {!current && programs.length > 0 && (
              <Card className="xl:col-span-2">
                <CardContent className="p-8 text-center text-muted-foreground">
                  You are not enrolled in a program yet. Your coach can assign one from the admin clients area.
                </CardContent>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="all" className="mt-6 grid gap-4 md:grid-cols-3">
            {programs.map((program) => (
              <Card key={program.id}>
                <CardHeader className="food-band min-h-36 justify-end">
                  <CardTitle className="brand-serif text-3xl text-white">{program.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-5">
                  <p className="text-sm text-muted-foreground">{program.description}</p>
                  <Badge variant="secondary">{program.bestFor}</Badge>
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/programs?program=${program.slug}`}>View Program</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          <TabsContent value="completed" className="mt-6 grid gap-4 md:grid-cols-3">
            {completedPrograms.map((program) => (
              <Card key={program.id}>
                <CardHeader>
                  <Badge className="w-fit">Completed</Badge>
                  <CardTitle>{program.title}</CardTitle>
                  <CardDescription>{program.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Progress value={program.progress} />
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/programs?program=${program.slug}`}>Review Program</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
            {completedPrograms.length === 0 && (
              <Card className="md:col-span-3">
                <CardContent className="p-8 text-center text-muted-foreground">
                  Completed programs will appear here after your first full program.
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}
