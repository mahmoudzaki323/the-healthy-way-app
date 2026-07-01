import { Send } from "lucide-react"

import { sendMessageAction, startConversationAction } from "@/lib/actions"
import { getCurrentProfile } from "@/lib/auth"
import { getConversations } from "@/lib/data"
import { AppShell } from "@/components/app-shell"
import { PageHeader } from "@/components/page-header"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default async function MessagesPage() {
  const profile = await getCurrentProfile("client")
  const conversations = await getConversations(profile)
  const conversation = conversations[0]

  return (
    <AppShell profile={profile}>
      <div className="space-y-6 p-4 md:p-6">
        <PageHeader title="Messages" description="Ask questions and follow up with your coach." />
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Inbox</CardTitle>
              <CardDescription>Coach conversations and check-in follow-ups.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {conversations.map((item) => (
                <div key={item.id} className="rounded-md border bg-primary/5 p-3">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.messages.at(-1)?.body}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="min-h-[680px]">
            {conversation ? (
              <>
            <CardHeader>
              <CardTitle>{conversation.title}</CardTitle>
              <CardDescription>Private message thread.</CardDescription>
            </CardHeader>
            <CardContent className="flex min-h-[520px] flex-col justify-between gap-4">
              <div className="space-y-4">
                {conversation.messages.map((message) => (
                  <div key={message.id} className="flex gap-3">
                    <Avatar><AvatarFallback>{message.senderName.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                    <div className="rounded-md border p-3">
                      <p className="text-sm font-medium">{message.senderName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{message.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <form action={sendMessageAction} className="flex gap-2">
                <input type="hidden" name="conversationId" value={conversation.id} />
                <Input name="body" placeholder="Write a message..." required />
                <Button type="submit"><Send className="size-4" /> Send</Button>
              </form>
            </CardContent>
              </>
            ) : (
              <>
                <CardHeader>
                  <CardTitle>No conversation yet</CardTitle>
                  <CardDescription>Start a private coach thread for questions and follow-up.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form action={startConversationAction}>
                    <Button type="submit"><Send className="size-4" /> Start Coach Conversation</Button>
                  </form>
                </CardContent>
              </>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
