import { Archive, Copy, Eye, Pencil, Plus } from "lucide-react"

import {
  adminArchiveAction,
  adminAssignAction,
  adminDuplicateAction,
  adminUpdateContentAction,
} from "@/lib/actions"
import { requireCoachProfile } from "@/lib/auth"
import { getAdminContentItems, getClientRoster, getPrograms } from "@/lib/data"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { AdminContentItem, Profile, Program } from "@/lib/types"

const contentTabs: { value: string; label: string; types: AdminContentItem["type"][] }[] = [
  { value: "All", label: "All", types: [] },
  { value: "Workouts", label: "Workouts", types: ["Workout"] },
  { value: "Recipes", label: "Recipes", types: ["Recipe"] },
  { value: "Live Calls", label: "Live Calls", types: ["Live Call"] },
  { value: "Resources", label: "Resources", types: ["Resource"] },
  { value: "Programs", label: "Programs", types: ["Program"] },
  { value: "Goals", label: "Goals", types: ["Goal"] },
]

function AssignDialog({
  item,
  programs,
  clients,
}: {
  item: AdminContentItem
  programs: Program[]
  clients: Profile[]
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" disabled={item.status === "draft"}>
          <Plus className="size-4" />
          Assign
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign {item.title}</DialogTitle>
          <DialogDescription>
            Send this item to all clients, one program, or one client.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <form action={adminAssignAction} className="space-y-3 rounded-md border p-3">
            <input type="hidden" name="entityType" value={item.type} />
            <input type="hidden" name="entityId" value={item.id} />
            <input type="hidden" name="targetType" value="all_clients" />
            <input type="hidden" name="target" value="All active clients" />
            <input type="hidden" name="returnTo" value="/admin/content" />
            <Input name="dueDate" type="date" required />
            <Button type="submit" className="w-full">
              Assign to All Clients
            </Button>
          </form>
          <form action={adminAssignAction} className="space-y-3 rounded-md border p-3">
            <input type="hidden" name="entityType" value={item.type} />
            <input type="hidden" name="entityId" value={item.id} />
            <input type="hidden" name="targetType" value="program" />
            <input type="hidden" name="target" value="Selected program" />
            <input type="hidden" name="returnTo" value="/admin/content" />
            <Select name="targetId" defaultValue={programs[0]?.id}>
              <SelectTrigger>
                <SelectValue placeholder="Select program" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input name="dueDate" type="date" required />
            <Button
              type="submit"
              variant="outline"
              className="w-full"
              disabled={programs.length === 0}
            >
              Assign to Program
            </Button>
          </form>
          <form action={adminAssignAction} className="space-y-3 rounded-md border p-3">
            <input type="hidden" name="entityType" value={item.type} />
            <input type="hidden" name="entityId" value={item.id} />
            <input type="hidden" name="targetType" value="client" />
            <input type="hidden" name="target" value="Selected client" />
            <input type="hidden" name="returnTo" value="/admin/content" />
            <Select name="targetId" defaultValue={clients[0]?.id}>
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input name="dueDate" type="date" required />
            <Button
              type="submit"
              variant="outline"
              className="w-full"
              disabled={clients.length === 0}
            >
              Assign to Client
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ContentActions({
  item,
  programs,
  clients,
}: {
  item: AdminContentItem
  programs: Program[]
  clients: Profile[]
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Pencil className="size-4" />
            Edit
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {item.title}</DialogTitle>
            <DialogDescription>Update the title or lifecycle status.</DialogDescription>
          </DialogHeader>
          <form action={adminUpdateContentAction} className="space-y-4">
            <input type="hidden" name="entityType" value={item.type} />
            <input type="hidden" name="entityId" value={item.id} />
            <Input name="title" defaultValue={item.title} required />
            <Select name="status" defaultValue={item.status}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" className="w-full">
              Save Changes
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <form action={adminDuplicateAction}>
        <input type="hidden" name="entityType" value={item.type} />
        <input type="hidden" name="entityId" value={item.id} />
        <Button type="submit" variant="outline" size="sm">
          <Copy className="size-4" />
          Duplicate
        </Button>
      </form>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Eye className="size-4" />
            Preview
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{item.title}</DialogTitle>
            <DialogDescription>
              {item.type} summary and publishing details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              {item.preview || "No preview text has been added yet."}
            </p>
            <div className="grid gap-2 rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <span>Status</span>
                <Badge>{item.status}</Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Audience</span>
                <span className="text-muted-foreground">{item.assignedTo}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Updated</span>
                <span className="text-muted-foreground">{item.updatedAt}</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <form action={adminArchiveAction}>
        <input type="hidden" name="entityType" value={item.type} />
        <input type="hidden" name="entityId" value={item.id} />
        <Button type="submit" variant="outline" size="sm">
          <Archive className="size-4" />
          Archive
        </Button>
      </form>
      <AssignDialog item={item} programs={programs} clients={clients} />
    </div>
  )
}

function ContentList({
  items,
  programs,
  clients,
}: {
  items: AdminContentItem[]
  programs: Program[]
  clients: Profile[]
}) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          No content in this section yet.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Manager</CardTitle>
        <CardDescription>
          Archive keeps client history. Preview opens the actual content summary.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="grid gap-3 rounded-md border p-3 text-sm xl:grid-cols-[1fr_120px_220px_110px_360px] xl:items-center"
          >
            <div>
              <p className="font-medium">{item.title}</p>
              <p className="line-clamp-1 text-muted-foreground">
                {item.preview || item.updatedAt}
              </p>
            </div>
            <Badge variant="secondary">{item.type}</Badge>
            <span>{item.assignedTo}</span>
            <Badge>{item.status}</Badge>
            <ContentActions item={item} programs={programs} clients={clients} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default async function AdminContentPage() {
  const profile = await requireCoachProfile()
  const [contentItems, programs, roster] = await Promise.all([
    getAdminContentItems(),
    getPrograms(profile),
    getClientRoster(profile),
  ])

  return (
    <AppShell profile={profile} mode="admin">
      <div className="space-y-6 p-4 md:p-6">
        <PageHeader
          title="Content"
          description="Create, duplicate, summarize, archive, and assign coach content."
          actions={
            <div className="flex flex-wrap gap-2">
              <AdminQuickAdd type="workout" label="Add Workout" />
              <AdminQuickAdd type="recipe" label="Add Recipe" />
              <AdminQuickAdd type="resource" label="Add Resource" />
              <AdminQuickAdd type="goal" label="Add Goal" />
            </div>
          }
        />
        <Tabs defaultValue="All">
          <TabsList className="flex h-auto flex-wrap justify-start">
            {contentTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {contentTabs.map((tab) => {
            const items = tab.types.length
              ? contentItems.filter((item) => tab.types.includes(item.type))
              : contentItems

            return (
              <TabsContent key={tab.value} value={tab.value} className="mt-6">
                <ContentList
                  items={items}
                  programs={programs}
                  clients={roster.clients}
                />
              </TabsContent>
            )
          })}
        </Tabs>
      </div>
    </AppShell>
  )
}
