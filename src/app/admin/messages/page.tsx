import Link from "next/link"
import { Mail, MessageSquare, Send, UserRound } from "lucide-react"

import {
  adminReplyCheckInAction,
  adminSendMessageAction,
  adminStartConversationAction,
} from "@/lib/actions"
import { requireCoachProfile } from "@/lib/auth"
import { getCheckIns, getClientRoster, getConversations } from "@/lib/data"
import { AppShell } from "@/components/app-shell"
import { PageHeader } from "@/components/page-header"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

type AdminMessagesPageProps = {
  searchParams?: Promise<{ client?: string; conversation?: string }>
}

export default async function AdminMessagesPage({ searchParams }: AdminMessagesPageProps) {
  const profile = await requireCoachProfile()
  const params = await searchParams
  const [conversations, checkIns, roster] = await Promise.all([
    getConversations(profile),
    getCheckIns(profile, "coach"),
    getClientRoster(profile),
  ])
  const conversation =
    conversations.find((item) => item.id === params?.conversation)
    ?? conversations.find((item) => item.members.some((member) => member.id === params?.client))
    ?? conversations[0]
  const latestCheckIn = checkIns[0]
  const conversationClient = conversation?.members.find((member) => member.id !== profile.id)
  const requestedClient = roster.clients.find((client) => client.id === params?.client)
  const primaryClient = conversationClient ?? requestedClient ?? roster.clients[0]

  return (
    <AppShell profile={profile} mode="admin">
      <div className="space-y-6 p-4 md:p-6">
        <PageHeader
          title="Messages"
          description="Manage private client messages and check-in follow-up from one coach inbox."
          actions={
            <div className="flex flex-wrap gap-2">
              {primaryClient && (
                <Button asChild variant="outline">
                  <a href={`mailto:${primaryClient.email}`}>
                    <Mail className="size-4" />
                    Email Client
                  </a>
                </Button>
              )}
              {conversation ? (
                <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Send className="size-4" />
                    New Message
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Message {primaryClient?.fullName ?? "client"}</DialogTitle>
                    <DialogDescription>
                      Send a direct message in the active coaching conversation.
                    </DialogDescription>
                  </DialogHeader>
                  <form action={adminSendMessageAction} className="space-y-4">
                    <input type="hidden" name="conversationId" value={conversation.id} />
                    <Textarea
                      name="body"
                      defaultValue="Checking in on your plan for this week."
                      required
                    />
                    <Button type="submit" className="w-full">
                      Send Message
                    </Button>
                  </form>
                </DialogContent>
                </Dialog>
              ) : primaryClient ? (
                <form action={adminStartConversationAction}>
                  <input type="hidden" name="clientId" value={primaryClient.id} />
                  <Button type="submit">
                    <Send className="size-4" />
                    Start Conversation
                  </Button>
                </form>
              ) : null}
            </div>
          }
        />

        <div className="grid gap-6 xl:grid-cols-[320px_1fr_340px]">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Inbox</CardTitle>
              <CardDescription>Active client conversations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {conversations.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-lg border p-3 ${item.id === conversation?.id ? "bg-primary/5" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10">
                      <AvatarFallback>{initials(item.members.find((member) => member.id !== profile.id)?.fullName ?? item.title)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.members.find((member) => member.id !== profile.id)?.fullName ?? item.title}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {item.messages.at(-1)?.body}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="secondary">{item.messages.length} messages</Badge>
                    <Button asChild size="sm">
                      <Link href={`/admin/messages?conversation=${item.id}`}>
                        <MessageSquare className="size-4" />
                        Open
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href="/admin/clients">
                        <UserRound className="size-4" />
                        Profile
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
              {conversations.length === 0 && (
                <p className="text-sm text-muted-foreground">No active conversations yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="min-h-[680px]">
            {conversation ? (
              <>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle>{conversation.title}</CardTitle>
                  <CardDescription>Private message thread.</CardDescription>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin/check-ins">
                    <MessageSquare className="size-4" />
                    Check-ins
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex min-h-[520px] flex-col justify-between gap-5">
              <div className="space-y-4">
                {conversation.messages.map((message) => {
                  const isCoach = message.senderId === profile.id

                  return (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${isCoach ? "flex-row-reverse" : ""}`}
                    >
                      <Avatar>
                        <AvatarFallback>{initials(message.senderName)}</AvatarFallback>
                      </Avatar>
                      <div className="max-w-[720px] rounded-lg border p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{message.senderName}</p>
                          <span className="text-xs text-muted-foreground">{message.createdAt}</span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{message.body}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
              <form action={adminSendMessageAction} className="grid gap-3 md:grid-cols-[1fr_auto]">
                <input type="hidden" name="conversationId" value={conversation.id} />
                <Input name="body" placeholder="Write a message..." required />
                <Button type="submit">
                  <Send className="size-4" />
                  Send
                </Button>
              </form>
            </CardContent>
              </>
            ) : (
              <>
	                <CardHeader>
	                  <CardTitle>No conversation selected</CardTitle>
	                  <CardDescription>
	                    Start a private coaching thread with the selected client.
	                  </CardDescription>
	                </CardHeader>
	                <CardContent className="space-y-4 text-sm text-muted-foreground">
	                  <p>
	                    {primaryClient
	                      ? `No private thread exists with ${primaryClient.fullName} yet.`
	                      : "Invite clients from the Clients page before starting a conversation."}
	                  </p>
	                  {primaryClient && (
	                    <form action={adminStartConversationAction}>
	                      <input type="hidden" name="clientId" value={primaryClient.id} />
	                      <Button type="submit">
	                        <Send className="size-4" />
	                        Start Conversation
	                      </Button>
	                    </form>
	                  )}
	                </CardContent>
	              </>
            )}
          </Card>

          <aside className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Follow-up Queue</CardTitle>
                <CardDescription>Convert check-ins into direct coach responses.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {latestCheckIn ? (
                  <div className="rounded-lg border p-3">
                  <p className="font-medium">{latestCheckIn.clientName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{latestCheckIn.supportNeeded}</p>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" className="mt-3">
                        <Send className="size-4" />
                        Reply to Check-in
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Check-in reply</DialogTitle>
                        <DialogDescription>
                          Save this response to the coach check-in reply log.
                        </DialogDescription>
                      </DialogHeader>
                      <form action={adminReplyCheckInAction} className="space-y-4">
                        <input type="hidden" name="checkInId" value={latestCheckIn.id} />
                        <input type="hidden" name="clientId" value={latestCheckIn.clientId} />
                        <Textarea name="body" defaultValue={latestCheckIn.feedback} required />
                        <Button type="submit" className="w-full">
                          Send Check-in Reply
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No check-ins need follow-up.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Client Context</CardTitle>
                <CardDescription>{primaryClient?.email ?? "No active client"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-medium">Availability</p>
                  <p className="text-muted-foreground">{primaryClient?.availability || "Pending"}</p>
                </div>
                <Separator />
                <div>
                  <p className="font-medium">Preferences</p>
                  <p className="text-muted-foreground">
                    {primaryClient?.dietaryPreferences.join(", ") || "Pending"}
                  </p>
                </div>
                <Separator />
                <Button asChild variant="outline" className="w-full">
                  <Link href="/admin/check-ins">Open Check-in Queue</Link>
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </AppShell>
  )
}
