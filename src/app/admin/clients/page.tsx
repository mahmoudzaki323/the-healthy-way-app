import Link from "next/link"
import { Mail, Plus, UserPlus } from "lucide-react"

import { adminAddClientAction, adminAssignAction } from "@/lib/actions"
import { requireCoachProfile } from "@/lib/auth"
import { getAdminContentItems, getClientRoster, getPrograms } from "@/lib/data"
import { AppShell } from "@/components/app-shell"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default async function AdminClientsPage() {
  const profile = await requireCoachProfile()
  const [programs, roster, contentItems] = await Promise.all([
    getPrograms(profile),
    getClientRoster(profile),
    getAdminContentItems(),
  ])
  const savedDefaultProgramId = profile.notificationPreferences.defaultProgramId
  const defaultProgramId = programs.some((program) => program.id === savedDefaultProgramId)
    ? savedDefaultProgramId ?? ""
    : programs[0]?.id ?? ""
  const assignableItems = contentItems.filter((item) => item.status === "published" || item.status === "scheduled")
  const defaultContentId = assignableItems[0] ? `${assignableItems[0].type}:${assignableItems[0].id}` : ""

  return (
    <AppShell profile={profile} mode="admin">
      <div className="space-y-6 p-4 md:p-6">
        <PageHeader
          title="Clients"
          description="Invite, message, assign, and review client progress."
          actions={
            <Dialog>
              <DialogTrigger asChild><Button><UserPlus className="size-4" /> Add Client</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Client</DialogTitle>
                  <DialogDescription>Send an invite and assign a starter program.</DialogDescription>
                </DialogHeader>
                <form action={adminAddClientAction} className="space-y-4">
                  <Input name="fullName" placeholder="Client name" required />
                  <Input name="email" type="email" placeholder="client@domain.com" required />
                  {programs.length > 0 ? (
                    <Select name="programId" defaultValue={defaultProgramId}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{programs.map((program) => <SelectItem key={program.id} value={program.id}>{program.title}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <input type="hidden" name="programId" value="" />
                  )}
                  <Button type="submit" className="w-full">Invite Client</Button>
                </form>
              </DialogContent>
            </Dialog>
          }
        />
        <Card>
          <CardHeader>
            <CardTitle>Client Roster</CardTitle>
            <CardDescription>Search, filter, message, and assign from one table.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {roster.clients.map((client) => (
              <div key={client.id} className="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_180px_120px_240px] md:items-center">
                <div>
                  <p className="font-medium">{client.fullName}</p>
                  <p className="text-sm text-muted-foreground">{client.email}</p>
                </div>
                <span>{client.availability || "Availability pending"}</span>
                <Badge>Active</Badge>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/messages?client=${client.id}`}>
                      <Mail className="size-4" />
                      Message
                    </Link>
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" disabled={assignableItems.length === 0}>
                        <Plus className="size-4" />
                        Assign
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Assign Content</DialogTitle>
                        <DialogDescription>Choose exactly what to send to this client.</DialogDescription>
                      </DialogHeader>
                      <form action={adminAssignAction} className="space-y-4">
                        <input type="hidden" name="targetType" value="client" />
                        <input type="hidden" name="targetId" value={client.id} />
                        <input type="hidden" name="target" value={client.fullName} />
                        <input type="hidden" name="returnTo" value="/admin/clients" />
                        <Select name="contentSelection" defaultValue={defaultContentId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select content" />
                          </SelectTrigger>
                          <SelectContent>
                            {assignableItems.map((item) => (
                              <SelectItem key={item.id} value={`${item.type}:${item.id}`}>
                                {item.type}: {item.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input name="dueDate" type="date" required />
                        <Button type="submit" className="w-full" disabled={assignableItems.length === 0}>
                          Assign Selected Content
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))}
            {roster.clients.length === 0 && (
              <p className="text-sm text-muted-foreground">No active clients yet. Invited clients appear here after signup.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>Share the invite code with the client after creating it.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {roster.invitations.map((invite) => (
              <div key={invite.id} className="grid gap-3 rounded-md border p-3 text-sm md:grid-cols-[1fr_160px_140px] md:items-center">
                <div>
                  <p className="font-medium">{invite.email}</p>
                  <p className="text-muted-foreground">Code: {invite.code}</p>
                </div>
                <Badge variant={invite.acceptedAt ? "secondary" : "default"}>{invite.acceptedAt ? "Accepted" : "Pending"}</Badge>
                <span className="text-muted-foreground">{invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString() : "No expiry"}</span>
              </div>
            ))}
            {roster.invitations.length === 0 && (
              <p className="text-sm text-muted-foreground">No invitations yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
