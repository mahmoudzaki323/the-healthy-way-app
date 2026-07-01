import { Plus } from "lucide-react"

import { adminCreateContentAction } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import type { Profile, Program } from "@/lib/types"

type AdminQuickAddProps = {
  type: "workout" | "recipe" | "live-call" | "resource" | "goal" | "program"
  label: string
  programs?: Program[]
  clients?: Profile[]
}

export function AdminQuickAdd({ type, label, programs = [], clients = [] }: AdminQuickAddProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button><Plus className="size-4" /> {label}</Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{label}</SheetTitle>
          <SheetDescription>Create a draft or publish it to the client library.</SheetDescription>
        </SheetHeader>
        <form action={adminCreateContentAction} className="mt-6 space-y-4">
          <input type="hidden" name="type" value={type} />
          <div className="space-y-2">
            <Label htmlFor={`${type}-title`}>Title</Label>
            <Input id={`${type}-title`} name="title" defaultValue={defaultTitle(type)} required />
          </div>
          {(type === "recipe" || type === "resource" || type === "goal" || type === "program") && (
            <div className="space-y-2">
              <Label>Description / Summary</Label>
              <Textarea name={type === "resource" ? "summary" : "description"} defaultValue="Simple, coach-created content clients can use this week." required />
            </div>
          )}
          {type === "recipe" && (
            <>
              <Input name="mealType" defaultValue="Lunch" required />
              <Input name="servings" type="number" defaultValue="2" required />
              <Input name="prepMinutes" type="number" defaultValue="15" required />
              {["Grilled chicken", "Quinoa", "Greens"].map((item) => <Input key={item} name="ingredients" defaultValue={item} required />)}
              {["Cook protein", "Build bowl", "Add dressing"].map((item) => <Input key={item} name="steps" defaultValue={item} required />)}
            </>
          )}
          {type === "workout" && (
            <>
              <Input name="durationMinutes" type="number" defaultValue="45" required />
              <Input name="difficulty" defaultValue="Intermediate" required />
              <Input name="category" defaultValue="Strength" required />
              {["Goblet Squat", "Dumbbell Row", "Plank Hold"].map((item) => <Input key={item} name="exercises" defaultValue={item} required />)}
            </>
          )}
          {type === "live-call" && (
            <>
              <Input name="startsAt" type="datetime-local" required />
              <Input name="durationMinutes" type="number" defaultValue="60" required />
              <Input name="callUrl" type="url" placeholder="Paste call link" required />
              <Input name="timezone" defaultValue="America/Los_Angeles" required />
              <Select name="targetSelection" defaultValue="all_clients">
                <SelectTrigger><SelectValue placeholder="Choose audience" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_clients">All active clients</SelectItem>
                  {programs.map((program) => (
                    <SelectItem key={program.id} value={`program:${program.id}`}>
                      Program: {program.title}
                    </SelectItem>
                  ))}
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={`client:${client.id}`}>
                      Client: {client.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {["Welcome & Check-in", "Topic Deep Dive", "Q&A"].map((item) => <Input key={item} name="agenda" defaultValue={item} required />)}
            </>
          )}
          {type === "resource" && (
            <>
              <Select name="resourceType" defaultValue="article">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="article">Article</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="worksheet">Worksheet</SelectItem>
                </SelectContent>
              </Select>
              <Input name="topic" defaultValue="Nutrition" required />
              <Input name="url" type="url" defaultValue="https://nutritionsource.hsph.harvard.edu/healthy-eating-plate/" />
              <Textarea name="content" defaultValue="Resource content, link, or instructions for clients." required />
            </>
          )}
          {type === "goal" && (
            <>
              <Input name="targetDays" type="number" min="1" max="7" defaultValue="5" required />
              <Input name="metric" defaultValue="Days completed" required />
            </>
          )}
          {type === "program" && (
            <>
              <Input name="durationWeeks" type="number" min="1" max="52" defaultValue="6" required />
              <Textarea name="bestFor" defaultValue="Healthy lifestyle, balanced meals, and sustainable fitness." required />
            </>
          )}
          <div className="grid gap-3 sm:grid-cols-1">
            <Select name="status" defaultValue="published">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Save Draft</SelectItem>
                <SelectItem value="published">Publish</SelectItem>
                <SelectItem value="scheduled">Schedule</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="submit" variant="outline" name="intent" value="draft">Save Draft</Button>
            <Button type="submit">Create Content</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function defaultTitle(type: AdminQuickAddProps["type"]) {
  return {
    workout: "Full Body Strength",
    recipe: "Lemon Ginger Protein Bowl",
    "live-call": "Live Coaching Call",
    resource: "Balanced Plate Guide",
    goal: "Eat with Intention",
    program: "Balanced & Bright",
  }[type]
}
