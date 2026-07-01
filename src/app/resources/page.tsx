import { Download, ExternalLink, Search } from "lucide-react"

import { saveResourceReadAction } from "@/lib/actions"
import { getCurrentProfile } from "@/lib/auth"
import { getResources } from "@/lib/data"
import { AppShell } from "@/components/app-shell"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type ResourcesPageProps = {
  searchParams?: Promise<{ resource?: string; type?: string; topic?: string; q?: string }>
}

export default async function ResourcesPage({ searchParams }: ResourcesPageProps) {
  const profile = await getCurrentProfile("client")
  const resources = await getResources(profile)
  const params = await searchParams
  const selectedResource = resources.find((resource) => resource.id === params?.resource)
  const searchTerm = (params?.q ?? "").trim().toLowerCase()
  const activeFilter = params?.resource || params?.type || params?.topic || params?.q
  const filteredResources = resources.filter((resource) => {
    const typeFilter = params?.type && params.type !== "all" ? resource.type === params.type : true
    const topicFilter = params?.topic && params.topic !== "all" ? resource.topic.toLowerCase() === params.topic.toLowerCase() : true
    const searchFilter = searchTerm
      ? [
          resource.title,
          resource.summary,
          resource.body,
          resource.topic,
          resource.type,
          ...resource.tags,
        ].some((value) => value.toLowerCase().includes(searchTerm))
      : true

    return typeFilter && topicFilter && searchFilter
  })
  const visibleResources = selectedResource
    ? [selectedResource, ...filteredResources.filter((resource) => resource.id !== selectedResource.id)]
    : filteredResources
  const savedResources = filteredResources.filter((resource) => resource.saved)
  const completedResources = filteredResources.filter((resource) => resource.complete)

  return (
    <AppShell profile={profile}>
      <div className="space-y-6 p-4 md:p-6">
        <PageHeader title="Resources" description="Articles, worksheets, videos, PDFs, and call prep materials." />
        <Card>
          <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_160px_160px]">
            <form action="/resources" className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input name="q" defaultValue={params?.q ?? ""} className="pl-9" placeholder="Search resources..." />
              </div>
              <Button type="submit" variant="outline">Search</Button>
            </form>
            <Button variant="outline" asChild><a href="/resources?type=all">All Types</a></Button>
            <Button variant="outline" asChild><a href="/resources?topic=all">All Topics</a></Button>
          </CardContent>
        </Card>
        {activeFilter && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium">Resource filters</p>
                <p className="text-sm text-muted-foreground">
                  {selectedResource
                    ? `Selected resource: ${selectedResource.title}.`
                    : searchTerm
                    ? `Showing resources matching "${params?.q}".`
                    : `Showing ${params?.type ? `type: ${params.type}` : `topic: ${params?.topic}`}.`}
                </p>
              </div>
              <Button asChild variant="outline" size="sm"><a href="/resources">Clear</a></Button>
            </CardContent>
          </Card>
        )}
        <Tabs defaultValue="library">
          <TabsList>
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="saved">Saved</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          <TabsContent value="library" className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleResources.map((resource) => (
              <Card key={resource.id} className={selectedResource?.id === resource.id ? "border-primary/50" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <Badge>{resource.type}</Badge>
                    <Badge variant="secondary">{resource.readMinutes} min</Badge>
                  </div>
                  <CardTitle>{resource.title}</CardTitle>
                  <CardDescription>{resource.summary}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {resource.tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                  </div>
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" className="w-full"><ExternalLink className="size-4" /> Open Resource</Button>
                    </SheetTrigger>
                    <SheetContent>
                      <SheetHeader>
                        <SheetTitle>{resource.title}</SheetTitle>
                        <SheetDescription>{resource.summary}</SheetDescription>
                      </SheetHeader>
                      <div className="mt-6 space-y-4">
                        <p className="text-sm leading-6 text-muted-foreground">{resource.body}</p>
                        {resource.url ? (
                          <Button asChild className="w-full"><a href={resource.url} target="_blank" rel="noreferrer"><Download className="size-4" /> Download / Open</a></Button>
                        ) : (
                          <p className="text-sm text-muted-foreground">No external file or link is attached yet.</p>
                        )}
                      </div>
                    </SheetContent>
                  </Sheet>
                  <form action={saveResourceReadAction} className="space-y-3">
                    <input type="hidden" name="resourceId" value={resource.id} />
                    <Label className="flex items-center gap-3 rounded-md border p-3">
                      <Checkbox name="saved" defaultChecked={resource.saved} />
                      Save
                    </Label>
                    <Label className="flex items-center gap-3 rounded-md border p-3">
                      <Checkbox name="completed" defaultChecked={resource.complete} />
                      Mark Complete
                    </Label>
                    <Button type="submit" className="w-full">Save Resource Status</Button>
                  </form>
                </CardContent>
              </Card>
            ))}
            {visibleResources.length === 0 && (
              <Card className="md:col-span-2 xl:col-span-3">
                <CardContent className="p-8 text-center text-muted-foreground">
                  No resources match that search or filter.
                </CardContent>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="saved" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {savedResources.map((resource) => (
                <Card key={resource.id}>
                  <CardHeader>
                    <Badge className="w-fit">{resource.type}</Badge>
                    <CardTitle>{resource.title}</CardTitle>
                    <CardDescription>{resource.summary}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Saved to your resource list.
                  </CardContent>
                </Card>
              ))}
              {savedResources.length === 0 && (
                <Card className="md:col-span-2 xl:col-span-3">
                  <CardContent className="p-6 text-sm text-muted-foreground">
                    Saved resources appear here after you save them from the library.
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
          <TabsContent value="completed" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {completedResources.map((resource) => (
                <Card key={resource.id}>
                  <CardHeader>
                    <Badge className="w-fit">{resource.type}</Badge>
                    <CardTitle>{resource.title}</CardTitle>
                    <CardDescription>{resource.summary}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Completed resource.
                  </CardContent>
                </Card>
              ))}
              {completedResources.length === 0 && (
                <Card className="md:col-span-2 xl:col-span-3">
                  <CardContent className="p-6 text-sm text-muted-foreground">
                    Completed resources appear here after you mark them complete.
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}
