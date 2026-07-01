import { BarChart3, Flame, MessageSquare, Plus, Target } from "lucide-react"

import {
  logMetricEntryAction,
  saveGoalAction,
  sendMessageAction,
  toggleGoalLogAction,
} from "@/lib/actions"
import { getCurrentProfile } from "@/lib/auth"
import {
  getCheckIns,
  getConversations,
  getGoals,
  getMetricEntries,
  getNonScaleWins,
} from "@/lib/data"
import { AppShell } from "@/components/app-shell"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

type GoalsPageProps = {
  searchParams?: Promise<{ goal?: string }>
}

export default async function GoalsPage({ searchParams }: GoalsPageProps) {
  const profile = await getCurrentProfile("client")
  const params = await searchParams
  const [goals, checkIns, conversations, wins, metrics] = await Promise.all([
    getGoals(profile),
    getCheckIns(profile),
    getConversations(profile),
    getNonScaleWins(profile),
    getMetricEntries(profile),
  ])
  const conversation = conversations[0]
  const selectedGoal = goals.find((goal) => goal.id === params?.goal)
  const visibleGoals = selectedGoal
    ? [selectedGoal, ...goals.filter((goal) => goal.id !== selectedGoal.id)]
    : goals
  const energyMetrics = metrics.filter((metric) => metric.metric === "Energy").slice(-7)

  return (
    <AppShell profile={profile}>
      <div className="space-y-6 p-4 md:p-6">
        <PageHeader
          title="Goals & Progress"
          description="Track healthy habits, energy, consistency, and non-scale wins."
          actions={
            <div className="flex flex-wrap gap-2">
              <Dialog>
                <DialogTrigger asChild><Button><Plus className="size-4" /> Update Goal</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Update Goal</DialogTitle>
                    <DialogDescription>Set a clear, supportive target.</DialogDescription>
                  </DialogHeader>
                  <form action={saveGoalAction} className="space-y-4">
                    <Input name="title" defaultValue="Plan tomorrow today" required />
                    <Textarea name="description" defaultValue="Take five minutes at night to plan tomorrow's meals and movement." required />
                    <Input name="targetDays" type="number" min="1" max="7" defaultValue="5" required />
                    <Input name="metric" defaultValue="Days completed" required />
                    <Button type="submit" className="w-full">Save Goal</Button>
                  </form>
                </DialogContent>
              </Dialog>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline"><BarChart3 className="size-4" /> Add Metric</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Metric</DialogTitle>
                    <DialogDescription>Log a simple progress measurement for your coach.</DialogDescription>
                  </DialogHeader>
                  <form action={logMetricEntryAction} className="space-y-4">
                    <Input name="metric" defaultValue="Energy" required />
                    <Input name="value" type="number" min="0" step="0.1" defaultValue="7" required />
                    <Input name="unit" defaultValue="/10" />
                    <Textarea name="note" placeholder="Optional note" />
                    <Button type="submit" className="w-full">Save Metric</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          }
        />
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {visibleGoals.map((goal) => (
                <Card key={goal.id} className={selectedGoal?.id === goal.id ? "border-primary/50" : ""}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Target className="size-5 text-primary" /> {goal.title}</CardTitle>
                    <CardDescription>{goal.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Progress value={(goal.completedDays / goal.targetDays) * 100} />
                    <div className="flex justify-between text-sm">
                      <span>{goal.completedDays} of {goal.targetDays} days this week</span>
                      <Badge variant="secondary">{goal.metric}</Badge>
                    </div>
                    <form action={toggleGoalLogAction}>
                      <input type="hidden" name="goalId" value={goal.id} />
                      <Label className="flex items-center gap-3 rounded-md border p-3">
                        <Checkbox name="completed" defaultChecked={goal.completedDays > 0} />
                        Toggle today
                      </Label>
                      <Button type="submit" variant="outline" className="mt-3 w-full">Save Habit</Button>
                    </form>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Weekly Habits</CardTitle>
                <CardDescription>Read-only weekly pattern from saved habit logs.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <div className="min-w-[680px] space-y-3">
                  {goals.map((goal) => (
                    <div key={goal.id} className="grid grid-cols-[1fr_repeat(7,48px)_80px] items-center gap-2 rounded-md border p-3 text-sm">
                      <span className="font-medium">{goal.title}</span>
                      {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
                        <div key={`${goal.id}-${day}-${index}`} className="flex justify-center">
                          <Checkbox defaultChecked={index < goal.completedDays} disabled />
                        </div>
                      ))}
                      <span className="text-muted-foreground">{goal.completedDays}/7</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="energy">
                  <TabsList>
                    <TabsTrigger value="energy">Energy</TabsTrigger>
                    <TabsTrigger value="sleep">Sleep</TabsTrigger>
                    <TabsTrigger value="consistency">Consistency</TabsTrigger>
                  </TabsList>
                  <TabsContent value="energy" className="pt-5">
                    <div className="flex h-64 items-end gap-3 rounded-md border p-4">
                      {(energyMetrics.length ? energyMetrics.map((metric) => Number(metric.value) * 10) : [0]).map((value, index) => (
                        <div key={index} className="flex flex-1 flex-col items-center gap-2">
                          <div className="w-full rounded-t bg-primary" style={{ height: `${value}%` }} />
                          <span className="text-xs text-muted-foreground">W{index + 1}</span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  <TabsContent value="sleep" className="pt-5 text-muted-foreground">Sleep entries appear as you log them in check-ins.</TabsContent>
                  <TabsContent value="consistency" className="pt-5 text-muted-foreground">Consistency is calculated from saved goal logs.</TabsContent>
                </Tabs>
                {metrics.length > 0 && (
                  <div className="mt-5 space-y-2">
                    {metrics.slice(-4).reverse().map((metric) => (
                      <div key={metric.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                        <span className="font-medium">{metric.metric}</span>
                        <span className="text-muted-foreground">
                          {metric.value}{metric.unit ? ` ${metric.unit}` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <aside className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Flame className="size-5 text-amber-500" /> Streaks</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-3 gap-3 text-center">
                {goals.slice(0, 3).map((goal) => (
                  <div key={goal.id}><b className="text-3xl text-primary">{goal.completedDays}</b><span className="block text-xs text-muted-foreground">{goal.metric}</span></div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Non-scale Wins</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {(wins.length ? wins : ["Wins will appear here after check-ins."]).map((win) => (
                  <p key={win} className="flex gap-2"><span className="text-primary">✓</span>{win}</p>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Coach Feedback</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {checkIns[0]?.feedback ?? "Coach feedback will appear after a check-in is reviewed."}
                </p>
                {conversation ? (
                  <form action={sendMessageAction} className="space-y-3">
                    <input type="hidden" name="conversationId" value={conversation.id} />
                    <Textarea name="body" placeholder="Send your coach an update..." required />
                    <Button type="submit" className="w-full"><MessageSquare className="size-4" /> Send Message</Button>
                  </form>
                ) : (
                  <Button asChild className="w-full"><a href="/messages"><MessageSquare className="size-4" /> Open Messages</a></Button>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </AppShell>
  )
}
