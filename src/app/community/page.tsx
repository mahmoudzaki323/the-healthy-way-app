import { Flag, Heart, MessageCircle, Plus, Reply, Tag } from "lucide-react"

import { addCommunityReactionAction, createCommunityCommentAction, createCommunityPostAction, reportCommunityPostAction } from "@/lib/actions"
import { getCurrentProfile } from "@/lib/auth"
import { getCommunityPosts, getCommunityTopics } from "@/lib/data"
import { AppShell } from "@/components/app-shell"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

export default async function CommunityPage() {
  const profile = await getCurrentProfile("client")
  const [communityPosts, topicRows] = await Promise.all([
    getCommunityPosts(),
    getCommunityTopics(),
  ])
  const topics = topicRows.length ? topicRows : ["Discussion"]

  return (
    <AppShell profile={profile}>
      <div className="space-y-6 p-4 md:p-6">
        <PageHeader title="Community" description="Private discussion, wins, questions, meal ideas, and support." />
        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <Tabs defaultValue="Discussion">
              <TabsList className="flex h-auto flex-wrap justify-start">
                {topics.map((topic) => <TabsTrigger key={topic} value={topic}>{topic}</TabsTrigger>)}
              </TabsList>
              {topics.map((topic) => (
                <TabsContent key={topic} value={topic} className="mt-5 space-y-5">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Plus className="size-5" /> New Post</CardTitle>
                      <CardDescription>Ask a question, share a win, or start a discussion.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form action={createCommunityPostAction} className="space-y-3">
                        <input type="hidden" name="topic" value={topic} />
                        <Input name="title" placeholder="Optional title" />
                        <Textarea name="body" placeholder="Share an update..." required />
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="gap-1">
                            <Tag className="size-3.5" />
                            {topic}
                          </Badge>
                          <Button type="submit">Post</Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                  {communityPosts.filter((post) => topic === "Discussion" || post.topic === topic).map((post) => (
                    <Card key={post.id} className={post.pinned ? "border-primary/40 bg-primary/5" : ""}>
                      <CardHeader>
                        <div className="flex flex-wrap items-center gap-2">
                          {post.pinned && <Badge>Pinned by Coach</Badge>}
                          <Badge variant="secondary">{post.topic}</Badge>
                          <span className="text-sm text-muted-foreground">{post.author} · {post.createdAt}</span>
                        </div>
                        <CardTitle>{post.title}</CardTitle>
                        <CardDescription>{post.body}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          <form action={addCommunityReactionAction}>
                            <input type="hidden" name="postId" value={post.id} />
                            <input type="hidden" name="reaction" value="heart" />
                            <Button type="submit" variant="outline" size="sm"><Heart className="size-4" /> {post.reactions}</Button>
                          </form>
                          <Badge variant="secondary" className="h-9 gap-1 px-3">
                            <MessageCircle className="size-4" /> {post.replies.length} Replies
                          </Badge>
                          <form action={reportCommunityPostAction}>
                            <input type="hidden" name="postId" value={post.id} />
                            <input type="hidden" name="reason" value="Member requested moderator review" />
                            <Button type="submit" variant="outline" size="sm"><Flag className="size-4" /> Report</Button>
                          </form>
                        </div>
                        {post.replies.map((reply) => (
                          <div key={reply.id} className="rounded-md border p-3 text-sm">
                            <b>{reply.author}</b>
                            <p className="mt-1 text-muted-foreground">{reply.body}</p>
                          </div>
                        ))}
                        <form action={createCommunityCommentAction} className="flex gap-2">
                          <input type="hidden" name="postId" value={post.id} />
                          <Input name="body" placeholder="Write a reply..." required />
                          <Button type="submit" variant="outline"><Reply className="size-4" /> Reply</Button>
                        </form>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              ))}
            </Tabs>
          </div>
          <aside className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Community Guidelines</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {["Be kind and respectful", "Protect privacy", "Stay on topic", "No self-promotion", "Celebrate progress", "Report concerns"].map((rule) => <p key={rule}>✓ {rule}</p>)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Topics</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {topics.map((topic) => (
                  <div key={topic} className="flex justify-between rounded-md border p-2 text-sm">
                    <span>{topic}</span>
                    <span>{communityPosts.filter((post) => topic === "Discussion" || post.topic === topic).length}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </AppShell>
  )
}
