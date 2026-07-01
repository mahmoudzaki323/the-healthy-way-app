import Link from "next/link"
import { CheckCircle2, MessageSquare, Send, UserRound } from "lucide-react"

import { adminReplyCheckInAction, adminResolveCheckInAction } from "@/lib/actions"
import { requireCoachProfile } from "@/lib/auth"
import { getCheckIns, getClientRoster } from "@/lib/data"
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
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import type { CheckIn } from "@/lib/types"

function ReplyDialog({ checkIn }: { checkIn: CheckIn }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm">
          <Send className="size-4" />
          Reply
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Reply to {checkIn.clientName}</DialogTitle>
          <DialogDescription>
            Send a clear next step based on the submitted win, challenge, and support request.
          </DialogDescription>
        </DialogHeader>
        <form action={adminReplyCheckInAction} className="space-y-4">
          <input type="hidden" name="checkInId" value={checkIn.id} />
          <input type="hidden" name="clientId" value={checkIn.clientId} />
          <div className="rounded-lg border p-3 text-sm">
            <p className="font-medium">Support needed</p>
            <p className="mt-1 text-muted-foreground">{checkIn.supportNeeded}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${checkIn.id}-body`}>Coach reply</Label>
            <Textarea
              id={`${checkIn.id}-body`}
              name="body"
              defaultValue={checkIn.feedback}
              className="min-h-32"
              required
            />
          </div>
          <Button type="submit" className="w-full">
            Send Check-in Reply
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CheckInCard({ checkIn }: { checkIn: CheckIn }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{checkIn.clientName}</CardTitle>
              <Badge>{checkIn.status}</Badge>
              <Badge variant="secondary">{checkIn.submittedAt}</Badge>
            </div>
            <CardDescription className="mt-2">
              Mood: {checkIn.mood}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/clients">
                <UserRound className="size-4" />
                Client
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/admin/messages?client=${checkIn.clientId}`}>
                <MessageSquare className="size-4" />
                Message
              </Link>
            </Button>
            <ReplyDialog checkIn={checkIn} />
            {checkIn.status !== "resolved" && (
              <form action={adminResolveCheckInAction}>
                <input type="hidden" name="checkInId" value={checkIn.id} />
                <Button type="submit" size="sm" variant="outline">
                  <CheckCircle2 className="size-4" />
                  Resolve
                </Button>
              </form>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-3">
          <p className="text-sm font-medium">Win</p>
          <p className="mt-2 text-sm text-muted-foreground">{checkIn.win}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-sm font-medium">Challenge</p>
          <p className="mt-2 text-sm text-muted-foreground">{checkIn.challenge}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-sm font-medium">Support Needed</p>
          <p className="mt-2 text-sm text-muted-foreground">{checkIn.supportNeeded}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyQueue({ status }: { status: string }) {
  return (
    <Card>
      <CardContent className="p-6 text-sm text-muted-foreground">
        No {status.toLowerCase()} check-ins in the current queue.
      </CardContent>
    </Card>
  )
}

export default async function AdminCheckInsPage() {
  const profile = await requireCoachProfile()
  const [checkIns, roster] = await Promise.all([
    getCheckIns(profile, "coach"),
    getClientRoster(profile),
  ])
  const primaryClient = roster.clients[0]
  const pending = checkIns.filter((checkIn) => checkIn.status === "pending")
  const reviewed = checkIns.filter((checkIn) => checkIn.status === "reviewed")
  const resolved = checkIns.filter((checkIn) => checkIn.status === "resolved")

  return (
    <AppShell profile={profile} mode="admin">
      <div className="space-y-6 p-4 md:p-6">
        <PageHeader
          title="Check-ins"
          description="Review client wins, challenges, support requests, and send coach replies."
          actions={
            <Button asChild>
              <Link href="/admin/messages">
                <MessageSquare className="size-4" />
                Open Messages
              </Link>
            </Button>
          }
        />

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Pending replies</p>
              <p className="mt-2 text-3xl font-semibold">{pending.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Client mood</p>
              <p className="mt-2 text-3xl font-semibold">{checkIns[0]?.mood ?? "Ready"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Primary client</p>
              <p className="mt-2 truncate text-3xl font-semibold">{primaryClient?.fullName ?? "No clients"}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <Tabs defaultValue="pending">
              <TabsList className="flex h-auto flex-wrap justify-start">
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
                <TabsTrigger value="resolved">Resolved</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
              <TabsContent value="pending" className="mt-5 space-y-4">
                {pending.length > 0 ? pending.map((checkIn) => (
                  <CheckInCard key={checkIn.id} checkIn={checkIn} />
                )) : <EmptyQueue status="Pending" />}
              </TabsContent>
              <TabsContent value="reviewed" className="mt-5 space-y-4">
                {reviewed.length > 0 ? reviewed.map((checkIn) => (
                  <CheckInCard key={checkIn.id} checkIn={checkIn} />
                )) : <EmptyQueue status="Reviewed" />}
              </TabsContent>
              <TabsContent value="resolved" className="mt-5 space-y-4">
                {resolved.length > 0 ? resolved.map((checkIn) => (
                  <CheckInCard key={checkIn.id} checkIn={checkIn} />
                )) : <EmptyQueue status="Resolved" />}
              </TabsContent>
              <TabsContent value="all" className="mt-5 space-y-4">
                {checkIns.map((checkIn) => (
                  <CheckInCard key={checkIn.id} checkIn={checkIn} />
                ))}
              </TabsContent>
            </Tabs>
          </div>

          <aside className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="size-5" />
                  Reply Checklist
                </CardTitle>
                <CardDescription>Keep each response specific and actionable.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  "Acknowledge the win first",
                  "Name the obstacle without judgment",
                  "Give one concrete next step",
                  "Invite a reply if the plan feels hard",
                ].map((item) => (
                  <div key={item} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 size-4 text-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Client Snapshot</CardTitle>
                <CardDescription>{primaryClient?.email ?? "No active client selected"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span>Availability</span>
                  <span className="text-right text-muted-foreground">{primaryClient?.availability || "Pending"}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-3">
                  <span>Preferences</span>
                  <span className="text-right text-muted-foreground">
                    {primaryClient?.dietaryPreferences.join(", ") || "Pending"}
                  </span>
                </div>
                <Separator />
                <Button asChild variant="outline" className="w-full">
                  <Link href="/admin/clients">Open Client Roster</Link>
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </AppShell>
  )
}
