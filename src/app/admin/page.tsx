import Link from "next/link"
import { CalendarDays, CheckCircle2, Users } from "lucide-react"

import { requireCoachProfile } from "@/lib/auth"
import { getAdminContentItems, getCalendarEvents, getCheckIns, getClientRoster, getPrograms } from "@/lib/data"
import { AppShell } from "@/components/app-shell"
import { AdminQuickAdd } from "@/components/admin-quick-add"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function AdminPage() {
  const profile = await requireCoachProfile()
  const [contentItems, checkIns, roster, events, programs] = await Promise.all([
    getAdminContentItems(),
    getCheckIns(profile, "coach"),
    getClientRoster(profile),
    getCalendarEvents(profile),
    getPrograms(profile),
  ])

  return (
    <AppShell profile={profile} mode="admin">
      <div className="space-y-6 p-4 md:p-6">
        <PageHeader
          title="Coach Admin"
          description="Manage clients, content, schedule, check-ins, and community without technical tools."
          actions={<div className="flex flex-wrap gap-2"><AdminQuickAdd type="workout" label="Add Workout" /><AdminQuickAdd type="recipe" label="Add Recipe" /><AdminQuickAdd type="live-call" label="Add Live Call" programs={programs} clients={roster.clients} /></div>}
        />
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Users className="size-5" /> Client Roster</CardTitle>
                    <CardDescription>Search, view, message, and assign clients.</CardDescription>
                  </div>
                  <Button asChild><Link href="/admin/clients">Add Client</Link></Button>
                </div>
              </CardHeader>
              <CardContent>
                {roster.clients.slice(0, 3).map((client) => (
                  <div key={client.id} className="grid grid-cols-[1fr_160px_120px_120px] gap-3 rounded-md border p-3 text-sm">
                    <div><b>{client.fullName}</b><p className="text-muted-foreground">{client.email}</p></div>
                    <span>{client.availability || "Availability pending"}</span>
                    <Badge>Active</Badge>
                    <Button asChild variant="outline" size="sm"><Link href="/admin/clients">View</Link></Button>
                  </div>
                ))}
                {roster.clients.length === 0 && (
                  <p className="text-sm text-muted-foreground">No active clients yet. Add a client to create an invitation.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Content Manager</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {contentItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="grid gap-3 rounded-md border p-3 text-sm md:grid-cols-[1fr_100px_160px_100px] md:items-center">
                    <div><b>{item.title}</b><p className="text-muted-foreground">{item.assignedTo}</p></div>
                    <Badge variant="secondary">{item.type}</Badge>
                    <span>{item.status}</span>
                    <Button asChild variant="outline" size="sm"><Link href="/admin/content">Edit</Link></Button>
                  </div>
                ))}
                {contentItems.length === 0 && (
                  <p className="text-sm text-muted-foreground">No content yet. Use the quick add buttons to create the first item.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="size-5" /> Weekly Schedule</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {events.slice(0, 4).map((event) => (
                  <div key={event.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                    <span>{new Date(event.startsAt).toLocaleDateString("en", { weekday: "short" })}: {event.title}</span>
                    <Button asChild variant="outline" size="sm"><Link href="/admin/schedule">+</Link></Button>
                  </div>
                ))}
                {events.length === 0 && (
                  <p className="text-sm text-muted-foreground">No schedule items yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
          <aside className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="size-5" /> Pending Check-ins</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {checkIns.map((checkIn) => (
                  <div key={checkIn.id} className="rounded-md border p-3">
                    <p className="font-medium">{checkIn.clientName}</p>
                    <p className="text-sm text-muted-foreground">{checkIn.win}</p>
                    <Button asChild variant="outline" size="sm" className="mt-3"><Link href="/admin/check-ins">Reply</Link></Button>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="food-band">
              <CardContent className="p-6">
                <p className="font-medium">Admin rule</p>
                <p className="mt-2 text-sm text-muted-foreground">Archive instead of delete. Client history remains intact.</p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </AppShell>
  )
}
