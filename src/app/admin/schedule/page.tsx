import Link from "next/link"
import {
  CalendarDays,
  CalendarPlus,
  Clock,
  Copy,
  ExternalLink,
  Plus,
} from "lucide-react"

import {
  adminAssignAction,
  adminDuplicateAction,
  adminSaveScheduleAction,
} from "@/lib/actions"
import { requireCoachProfile } from "@/lib/auth"
import {
  getAdminContentItems,
  getCalendarEvents,
  getClientRoster,
  getPrograms,
} from "@/lib/data"
import { AdminQuickAdd } from "@/components/admin-quick-add"
import { AppShell } from "@/components/app-shell"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import type { CalendarEvent, EventType } from "@/lib/types"
import type { Profile, Program } from "@/lib/types"

const eventLabels: Record<EventType, string> = {
  workout: "Workout",
  meal: "Meal",
  live_call: "Live Call",
  check_in: "Check-in",
  resource: "Resource",
  custom: "Custom",
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

function formatIcsDate(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
}

function scheduleDownloadHref(events: CalendarEvent[]) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Healthy Way//Coach Schedule//EN",
    ...events.flatMap((event) => [
      "BEGIN:VEVENT",
      `UID:${event.id}@thehealthyway`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description}`,
      `DTSTART:${formatIcsDate(event.startsAt)}`,
      `DTEND:${formatIcsDate(event.endsAt ?? event.startsAt)}`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ]

  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join("\n"))}`
}

function AssignDialog({
  title,
  entityType,
  entityId,
  programs,
  clients,
}: {
  title: string
  entityType: string
  entityId: string
  programs: Program[]
  clients: Profile[]
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Assign
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign {title}</DialogTitle>
          <DialogDescription>
            Send this item to a program, group, or client with a due date.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <form action={adminAssignAction} className="space-y-3 rounded-md border p-3">
            <input type="hidden" name="entityType" value={entityType} />
            <input type="hidden" name="entityId" value={entityId} />
            <input type="hidden" name="targetType" value="all_clients" />
            <input type="hidden" name="target" value="All active clients" />
            <input type="hidden" name="returnTo" value="/admin/schedule" />
            <Input name="dueDate" type="date" required />
            <Button type="submit" className="w-full">Assign to All Clients</Button>
          </form>
          <form action={adminAssignAction} className="space-y-3 rounded-md border p-3">
            <input type="hidden" name="entityType" value={entityType} />
            <input type="hidden" name="entityId" value={entityId} />
            <input type="hidden" name="targetType" value="program" />
            <input type="hidden" name="target" value="Selected program" />
            <input type="hidden" name="returnTo" value="/admin/schedule" />
            <Select name="targetId" defaultValue={programs[0]?.id}>
              <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
              <SelectContent>
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id}>{program.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input name="dueDate" type="date" required />
            <Button type="submit" variant="outline" className="w-full" disabled={programs.length === 0}>
              Assign to Program
            </Button>
          </form>
          <form action={adminAssignAction} className="space-y-3 rounded-md border p-3">
            <input type="hidden" name="entityType" value={entityType} />
            <input type="hidden" name="entityId" value={entityId} />
            <input type="hidden" name="targetType" value="client" />
            <input type="hidden" name="target" value="Selected client" />
            <input type="hidden" name="returnTo" value="/admin/schedule" />
            <Select name="targetId" defaultValue={clients[0]?.id}>
              <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>{client.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input name="dueDate" type="date" required />
            <Button type="submit" variant="outline" className="w-full" disabled={clients.length === 0}>
              Assign to Client
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default async function AdminSchedulePage() {
  const profile = await requireCoachProfile()
  const [events, programs, contentItems, roster] = await Promise.all([
    getCalendarEvents(profile),
    getPrograms(profile),
    getAdminContentItems(),
    getClientRoster(profile),
  ])
  const liveCall = events.find((event) => event.eventType === "live_call" && event.status !== "complete")
    ?? events.find((event) => event.eventType === "live_call")
  const defaultProgram = programs[0]
  const primaryClient = roster.clients[0]
  const schedulableItems = contentItems.filter((item) => (
    (item.status === "published" || item.status === "scheduled")
    && (item.type === "Workout" || item.type === "Recipe" || item.type === "Resource" || item.type === "Live Call")
  ))
  const builderSlots = events.slice(0, 4).map((event) => ({
    day: new Date(event.startsAt).toLocaleDateString("en", { weekday: "long" }),
    title: event.title,
    eventType: event.eventType,
    itemType: event.itemType,
    entityId: event.itemId ?? event.id,
    time: new Date(event.startsAt).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" }),
  }))

  return (
    <AppShell profile={profile} mode="admin">
      <div className="space-y-6 p-4 md:p-6">
        <PageHeader
          title="Schedule"
          description="Build the weekly client schedule, assign content, and export call reminders."
          actions={
            <div className="flex flex-wrap gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <CalendarPlus className="size-4" />
                    Add Schedule Item
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Add Schedule Item</DialogTitle>
                    <DialogDescription>Create a client-facing event, call, workout slot, or check-in reminder.</DialogDescription>
                  </DialogHeader>
                  <form action={adminSaveScheduleAction} className="space-y-4">
                    <input type="hidden" name="required" value="true" />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="eventType">Type</Label>
                        <Select name="eventType" defaultValue="live_call">
                          <SelectTrigger id="eventType"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="workout">Workout</SelectItem>
                            <SelectItem value="meal">Meal</SelectItem>
                            <SelectItem value="live_call">Live Call</SelectItem>
                            <SelectItem value="check_in">Check-in</SelectItem>
                            <SelectItem value="resource">Resource</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="durationMinutes">Duration</Label>
                        <Input id="durationMinutes" name="durationMinutes" type="number" min="5" defaultValue="60" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="schedule-title">Title</Label>
                      <Input id="schedule-title" name="title" defaultValue="Live Coaching Call" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="schedule-description">Description</Label>
                      <Textarea id="schedule-description" name="description" defaultValue="Weekly coaching call to review progress, wins, and next steps." required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="startsAt">Starts at</Label>
                      <Input id="startsAt" name="startsAt" type="datetime-local" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="callUrl">Call link</Label>
                      <Input id="callUrl" name="callUrl" type="url" placeholder="Paste call link" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="itemSelection">Linked content</Label>
                      <Select name="itemSelection" defaultValue="none">
                        <SelectTrigger id="itemSelection">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No linked content</SelectItem>
                          {schedulableItems.map((item) => (
                            <SelectItem key={item.id} value={`${item.type}:${item.id}`}>
                              {item.type}: {item.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="targetSelection">Audience</Label>
                      <Select name="targetSelection" defaultValue="all_clients">
                        <SelectTrigger id="targetSelection"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all_clients">All active clients</SelectItem>
                          {programs.map((program) => (
                            <SelectItem key={program.id} value={`program:${program.id}`}>
                              Program: {program.title}
                            </SelectItem>
                          ))}
                          {roster.clients.map((client) => (
                            <SelectItem key={client.id} value={`client:${client.id}`}>
                              Client: {client.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full">Save Schedule Item</Button>
                  </form>
                </DialogContent>
              </Dialog>
              <AdminQuickAdd type="live-call" label="Add Live Call" programs={programs} clients={roster.clients} />
              <AdminQuickAdd type="workout" label="Add Workout" />
              <Button asChild variant="outline">
                <a href={scheduleDownloadHref(events)} download="healthy-way-coach-week.ics">
                  <CalendarPlus className="size-4" />
                  Download Week
                </a>
              </Button>
            </div>
          }
        />

        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="size-5" />
                  Weekly Builder
                </CardTitle>
                <CardDescription>
                  Start from a practical template, then assign each slot to a client or program.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {builderSlots.map((slot) => (
                  <div
                    key={`${slot.day}-${slot.entityId}`}
                    className="grid gap-3 rounded-lg border p-3 md:grid-cols-[120px_1fr_140px_120px] md:items-center"
                  >
                    <div>
                      <p className="font-medium">{slot.day}</p>
                      <p className="text-sm text-muted-foreground">{slot.time}</p>
                    </div>
                    <div>
                      <p className="font-medium">{slot.title}</p>
                      <p className="text-sm text-muted-foreground">Choose a program, client, or all clients.</p>
                    </div>
                    <Badge variant="secondary">{eventLabels[slot.eventType]}</Badge>
	                    <AssignDialog
	                      title={slot.title}
	                      entityType={slot.itemType ?? "calendar_event"}
	                      entityId={slot.entityId}
	                      programs={programs}
	                      clients={roster.clients}
                    />
                  </div>
                ))}
                {builderSlots.length === 0 && (
                  <p className="text-sm text-muted-foreground">No schedule items yet. Add a schedule item to start the week.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Scheduled Events</CardTitle>
                <CardDescription>
                  Client-facing events pulled from the current app data.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>When</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="max-w-[280px] whitespace-normal">
                          <p className="font-medium">{event.title}</p>
                          <p className="text-sm text-muted-foreground">{event.description}</p>
                        </TableCell>
                        <TableCell>{formatDateTime(event.startsAt)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{eventLabels[event.eventType]}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge>{event.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {event.callUrl ? (
                            <Button asChild size="sm" variant="outline">
                              <a href={event.callUrl} target="_blank" rel="noreferrer">
                                <ExternalLink className="size-4" />
                                Open
                              </a>
                            </Button>
                          ) : (
	                            <AssignDialog
	                              title={event.title}
	                              entityType={event.itemType ?? "calendar_event"}
	                              entityId={event.itemId ?? event.id}
	                              programs={programs}
	                              clients={roster.clients}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Next Call</CardTitle>
                <CardDescription>Quickly confirm the public details before clients see it.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {liveCall ? (
                  <>
                    <div className="rounded-lg border p-3">
                      <p className="font-medium">{liveCall.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatDateTime(liveCall.startsAt)}
                      </p>
                    </div>
                    <div className="grid gap-2">
                      {liveCall.callUrl && (
                        <Button asChild>
                        <a href={liveCall.callUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="size-4" />
                          Open Call Link
                        </a>
                      </Button>
                      )}
                      <form action={adminDuplicateAction}>
                        <input type="hidden" name="entityType" value="live_call" />
                        <input type="hidden" name="entityId" value={liveCall.id} />
                        <Button type="submit" variant="outline" className="w-full">
                          <Copy className="size-4" />
                          Duplicate Call
                        </Button>
                      </form>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Add a live call to make it available on the client schedule.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Assignment Defaults</CardTitle>
                <CardDescription>Use this when a schedule slot needs a quick target change.</CardDescription>
              </CardHeader>
              <CardContent>
                {contentItems.length > 0 ? (
                  <div className="space-y-3">
                    {contentItems.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground">{item.type}</p>
                        </div>
                        <AssignDialog
                          title={item.title}
                          entityType={item.type}
                          entityId={item.id}
                          programs={programs}
                          clients={roster.clients}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Create content before assigning schedule defaults.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="size-5" />
                  Client Rhythm
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span>Program</span>
                  <Badge variant="secondary">{defaultProgram?.title ?? "None"}</Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-3">
                  <span>Client</span>
                  <Button asChild variant="link" className="h-auto p-0">
                    <Link href="/admin/clients">{primaryClient?.fullName ?? "Roster"}</Link>
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-3">
                  <span>Check-in queue</span>
                  <Button asChild variant="link" className="h-auto p-0">
                    <Link href="/admin/check-ins">Review</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </AppShell>
  )
}
