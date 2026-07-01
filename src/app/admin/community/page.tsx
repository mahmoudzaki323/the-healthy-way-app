import { Archive, Flag, MessageCircle, Pin, Plus, Reply } from "lucide-react"

import {
  adminArchiveAction,
  adminCreateCommunityCommentAction,
  adminCreateAnnouncementAction,
  adminFlagCommunityPostAction,
  adminPinAnnouncementAction,
} from "@/lib/actions"
import { requireCoachProfile } from "@/lib/auth"
import { getCommunityPosts, getCommunityTopics } from "@/lib/data"
import { AppShell } from "@/components/app-shell"
import { PageHeader } from "@/components/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import type { CommunityPost } from "@/lib/types"

function ReplyDialog({ post }: { post: CommunityPost }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Reply className="size-4" />
          Reply
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reply to {post.title ?? "community post"}</DialogTitle>
          <DialogDescription>
            Add a coach response that will appear in the community thread.
          </DialogDescription>
        </DialogHeader>
        <form action={adminCreateCommunityCommentAction} className="space-y-4">
          <input type="hidden" name="postId" value={post.id} />
          <Textarea name="body" defaultValue="Thank you for sharing this with the group." required />
          <Button type="submit" className="w-full">
            Post Reply
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PostModerationActions({ post }: { post: CommunityPost }) {
  return (
    <div className="flex flex-wrap gap-2">
      <form action={adminPinAnnouncementAction}>
        <input type="hidden" name="postId" value={post.id} />
        <Button type="submit" size="sm" variant="outline">
          <Pin className="size-4" />
          Pin
        </Button>
      </form>
      <ReplyDialog post={post} />
      <form action={adminFlagCommunityPostAction}>
        <input type="hidden" name="postId" value={post.id} />
        <input
          type="hidden"
          name="reason"
          value="Coach flagged this post for moderation follow-up."
        />
        <Button type="submit" size="sm" variant="outline">
          <Flag className="size-4" />
          Flag
        </Button>
      </form>
      <form action={adminArchiveAction}>
        <input type="hidden" name="entityType" value="community_post" />
        <input type="hidden" name="entityId" value={post.id} />
        <Button type="submit" size="sm" variant="outline">
          <Archive className="size-4" />
          Archive
        </Button>
      </form>
    </div>
  )
}

function PostCard({ post }: { post: CommunityPost }) {
  return (
    <Card className={post.pinned ? "border-primary/40 bg-primary/5" : ""}>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          {post.pinned && <Badge>Pinned</Badge>}
          <Badge variant="secondary">{post.topic}</Badge>
          <span className="text-sm text-muted-foreground">
            {post.author} · {post.createdAt}
          </span>
        </div>
        <CardTitle>{post.title ?? "Community update"}</CardTitle>
        <CardDescription>{post.body}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>{post.reactions} reactions</span>
          <span>{post.replies.length} replies</span>
        </div>
        {post.replies.length > 0 && (
          <div className="space-y-2">
            {post.replies.map((reply) => (
              <div key={reply.id} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{reply.author}</p>
                <p className="mt-1 text-muted-foreground">{reply.body}</p>
              </div>
            ))}
          </div>
        )}
        <PostModerationActions post={post} />
      </CardContent>
    </Card>
  )
}

export default async function AdminCommunityPage() {
  const profile = await requireCoachProfile()
  const [communityPosts, topicRows] = await Promise.all([
    getCommunityPosts(),
    getCommunityTopics(),
  ])
  const topics = topicRows.length ? topicRows : ["Discussion"]
  const memberPosts = communityPosts.filter((post) => post.authorRole === "client")
  const pinnedPosts = communityPosts.filter((post) => post.pinned)

  return (
    <AppShell profile={profile} mode="admin">
      <div className="space-y-6 p-4 md:p-6">
        <PageHeader
          title="Community"
          description="Publish announcements, reply as coach, and moderate member posts."
          actions={
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4" />
                  New Announcement
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>New Announcement</DialogTitle>
                  <DialogDescription>
                    Publish a coach update to the private community and pin it for visibility.
                  </DialogDescription>
                </DialogHeader>
                <form action={adminCreateAnnouncementAction} className="space-y-4">
                  <input type="hidden" name="topic" value="Discussion" />
                  <input type="hidden" name="pinned" value="on" />
                  <div className="space-y-2">
                    <Label htmlFor="announcement-title">Title</Label>
                    <Input
                      id="announcement-title"
                      name="title"
                      defaultValue="Coach Announcement"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="announcement-body">Announcement</Label>
                    <Textarea
                      id="announcement-body"
                      name="body"
                      defaultValue="Here is this week's focus and the support available inside the program."
                      className="min-h-32"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Publish Announcement
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          }
        />

        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <Alert>
              <Pin className="size-4" />
              <AlertTitle>Announcement lane</AlertTitle>
              <AlertDescription>
                Pinned posts stay visible for clients until you pin another update or archive old content.
              </AlertDescription>
            </Alert>

            <Tabs defaultValue="all">
              <TabsList className="flex h-auto flex-wrap justify-start">
                <TabsTrigger value="all">All Posts</TabsTrigger>
                <TabsTrigger value="pinned">Pinned</TabsTrigger>
                {topics.map((topic) => (
                  <TabsTrigger key={topic} value={topic}>
                    {topic}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="all" className="mt-5 space-y-4">
                {communityPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </TabsContent>
              <TabsContent value="pinned" className="mt-5 space-y-4">
                {pinnedPosts.length > 0 ? pinnedPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                )) : (
                  <Card>
                    <CardContent className="p-6 text-sm text-muted-foreground">
                      No pinned announcements yet.
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              {topics.map((topic) => (
                <TabsContent key={topic} value={topic} className="mt-5 space-y-4">
                  {communityPosts
                    .filter((post) => post.topic === topic)
                    .map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                </TabsContent>
              ))}
            </Tabs>
          </div>

          <aside className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flag className="size-5" />
                  Moderation Queue
                </CardTitle>
                <CardDescription>Member posts that need coach attention.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {memberPosts.map((post) => (
                  <div key={post.id} className="space-y-3 rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{post.title}</p>
                      <p className="text-sm text-muted-foreground">{post.body}</p>
                    </div>
                    <PostModerationActions post={post} />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Topic Health</CardTitle>
                <CardDescription>Keep discussions organized for clients.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {topics.map((topic) => {
                  const count = communityPosts.filter((post) => post.topic === topic).length

                  return (
                    <div
                      key={topic}
                      className="flex items-center justify-between rounded-lg border p-3 text-sm"
                    >
                      <span>{topic}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="size-5" />
                  Coach Tone
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Lead with clarity, protect member privacy, and move medical questions to direct support.</p>
                <Button asChild variant="outline" className="w-full">
                  <a href={`mailto:${profile.email}?subject=Community%20moderation`}>
                    Email Coach Account
                  </a>
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </AppShell>
  )
}
