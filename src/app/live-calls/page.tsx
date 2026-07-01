import { CalendarPlus, Download, Play, Video } from "lucide-react"

import { updateRsvpAction } from "@/lib/actions"
import { getCurrentProfile } from "@/lib/auth"
import { getCalendarEvents, getEventAgenda, getEventResources, getResources } from "@/lib/data"
import { AppShell } from "@/components/app-shell"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { CalendarEvent } from "@/lib/types"

function toIcsDate(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")
}

function calendarFileHref(call: CalendarEvent) {
  const content = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    `UID:${call.id}@the-healthy-way`,
    `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
    `DTSTART:${toIcsDate(call.startsAt)}`,
    call.endsAt ? `DTEND:${toIcsDate(call.endsAt)}` : "",
    `SUMMARY:${call.title}`,
    `DESCRIPTION:${call.description}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\n")
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(content)}`
}

export default async function LiveCallsPage() {
  const profile = await getCurrentProfile("client")
  const events = await getCalendarEvents(profile)
  const liveCalls = events.filter((event) => event.eventType === "live_call")
  const call = liveCalls.find((event) => event.status !== "complete") ?? liveCalls[0]
  const allResources = await getResources(profile)
  const replayResources = allResources.filter((resource) => resource.type === "video")
  const attachedResources = call ? await getEventResources(call.id, profile) : []
  const callResources = attachedResources.length
    ? attachedResources
    : allResources.filter((resource) => resource.type !== "video")
  const agenda = call ? await getEventAgenda(call.id) : []

  return (
    <AppShell profile={profile}>
      <div className="space-y-6 p-4 md:p-6">
        <PageHeader
          title="Live Calls"
          description="Join live sessions, RSVP, set reminders, and watch replays."
          actions={call?.callUrl ? <Button asChild><a href={call.callUrl} target="_blank" rel="noreferrer"><Video className="size-4" /> Join Call</a></Button> : undefined}
        />
        {!call && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No live calls are scheduled yet. Your coach can add one from the admin schedule or content area.
            </CardContent>
          </Card>
        )}
        {call && (
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <Card className="border-primary/30">
              <CardContent className="grid gap-4 p-5 md:grid-cols-[120px_1fr_auto] md:items-center">
                <div className="rounded-md border bg-accent p-5 text-center">
                  <p className="text-xs uppercase text-muted-foreground">
                    {new Date(call.startsAt).toLocaleDateString("en", { weekday: "short" })}
                  </p>
                  <p className="text-4xl font-semibold">
                    {new Date(call.startsAt).toLocaleDateString("en", { day: "numeric" })}
                  </p>
                  <p className="text-xs uppercase text-muted-foreground">
                    {new Date(call.startsAt).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
                <div>
                  <Badge className="mb-2">Next up</Badge>
                  <h2 className="text-2xl font-semibold">{call.title}</h2>
                  <p className="mt-2 text-muted-foreground">{call.description}</p>
                </div>
                <div className="grid gap-2">
                  {call.callUrl && (
                    <Button asChild><a href={call.callUrl} target="_blank" rel="noreferrer">Join Call</a></Button>
                  )}
                  <Button asChild variant="outline">
                    <a href={calendarFileHref(call)} download="healthy-way-live-call.ics">
                      <CalendarPlus className="size-4" />
                      Add to Calendar
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Tabs defaultValue="calendar">
              <TabsList>
                <TabsTrigger value="calendar">Calendar</TabsTrigger>
                <TabsTrigger value="list">List</TabsTrigger>
              </TabsList>
              <TabsContent value="calendar" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Upcoming Calls</CardTitle>
                    <CardDescription>Upcoming call schedule and RSVP status.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {liveCalls.map((event, index) => (
                      <div key={event.id} className="flex items-center justify-between gap-4 rounded-md border p-3">
                        <div>
                          <p className="font-medium">{event.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(event.startsAt).toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" })} · {new Date(event.startsAt).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })}
                          </p>
                        </div>
                        {event.callUrl ? (
                          <Button asChild variant={index === 0 ? "default" : "outline"}>
                            <a href={event.callUrl} target="_blank" rel="noreferrer">
                              Join Call
                            </a>
                          </Button>
                        ) : (
                          <form action={updateRsvpAction}>
                            <input type="hidden" name="eventId" value={event.id} />
                            <input type="hidden" name="status" value="going" />
                            <input type="hidden" name="reminderEnabled" value="true" />
                            <input type="hidden" name="reminderMinutes" value="15" />
                            <Button type="submit" variant="outline">
                              RSVP Going
                            </Button>
                          </form>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="list" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Call List</CardTitle>
                    <CardDescription>Every scheduled call with a direct action.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {liveCalls.map((event) => (
                      <div key={event.id} className="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_auto] md:items-center">
                        <div>
                          <p className="font-medium">{event.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(event.startsAt).toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" })} · {new Date(event.startsAt).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })}
                          </p>
                        </div>
                        {event.callUrl ? (
                          <Button asChild>
                            <a href={event.callUrl} target="_blank" rel="noreferrer">Join Call</a>
                          </Button>
                        ) : (
                          <form action={updateRsvpAction}>
                            <input type="hidden" name="eventId" value={event.id} />
                            <input type="hidden" name="status" value="going" />
                            <input type="hidden" name="reminderEnabled" value="true" />
                            <input type="hidden" name="reminderMinutes" value="15" />
                            <Button type="submit" variant="outline">RSVP Going</Button>
                          </form>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            <Card id="rsvp">
              <CardHeader>
                <CardTitle>Replay Library</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                {replayResources.map((resource) => (
                  resource.url ? (
                    <Button key={resource.id} asChild variant="outline" className="h-24 justify-start">
                      <a href={resource.url} target="_blank" rel="noreferrer">
                        <Play className="size-5" />
                        {resource.title.replace(" Replay", "")}
                      </a>
                    </Button>
                  ) : (
                    <div key={resource.id} className="rounded-md border p-4 text-sm text-muted-foreground">
                      {resource.title} is not available yet.
                    </div>
                  )
                ))}
                {replayResources.length === 0 && (
                  <p className="text-sm text-muted-foreground">Replays will appear after the coach adds a real video resource.</p>
                )}
              </CardContent>
            </Card>
          </div>
          <aside className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Agenda</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {agenda.map((item, index) => (
                  <div key={item} className="flex gap-3">
                    <span className="text-muted-foreground">Item {index + 1}</span>
                    <span>{item}</span>
                  </div>
                ))}
                {agenda.length === 0 && (
                  <p className="text-muted-foreground">No agenda items have been added to this call yet.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>RSVP</CardTitle></CardHeader>
              <CardContent>
                <form action={updateRsvpAction} className="space-y-4">
                  <input type="hidden" name="eventId" value={call.id} />
                  <Select name="status" defaultValue="going">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="going">Going</SelectItem>
                      <SelectItem value="maybe">Maybe</SelectItem>
                      <SelectItem value="declined">Declined</SelectItem>
                    </SelectContent>
                  </Select>
                  <Label className="flex items-center justify-between rounded-md border p-3">
                    Enable reminder
                    <input type="hidden" name="reminderEnabled" value="false" />
                    <Switch name="reminderEnabled" value="true" defaultChecked />
                  </Label>
                  <Select name="reminderMinutes" defaultValue="15">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes before</SelectItem>
                      <SelectItem value="30">30 minutes before</SelectItem>
                      <SelectItem value="60">1 hour before</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="submit" className="w-full">Update RSVP</Button>
                </form>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Call Resources</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {callResources.map((resource) => (
                  resource.url ? (
                    <Button key={resource.id} asChild variant="outline" className="w-full justify-start">
                      <a href={resource.url} target="_blank" rel="noreferrer">
                        <Download className="size-4" />
                        {resource.title}
                      </a>
                    </Button>
                  ) : (
                    <div key={resource.id} className="rounded-md border p-3 text-sm text-muted-foreground">
                      {resource.title}
                    </div>
                  )
                ))}
              </CardContent>
            </Card>
          </aside>
        </div>
        )}
      </div>
    </AppShell>
  )
}
