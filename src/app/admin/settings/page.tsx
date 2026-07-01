import { KeyRound, LogOut, Save, Settings } from "lucide-react"

import {
  adminSaveSettingsAction,
  passwordResetAction,
  signOutAction,
} from "@/lib/actions"
import { requireCoachProfile } from "@/lib/auth"
import { getGoals, getPrograms } from "@/lib/data"
import { AdminQuickAdd } from "@/components/admin-quick-add"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

const specialties = [
  "No restrictions",
  "Gluten-free",
  "Dairy-free",
  "Vegetarian",
  "High protein",
  "Meal prep",
]

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export default async function AdminSettingsPage() {
  const profile = await requireCoachProfile()
  const [programs, goals] = await Promise.all([
    getPrograms(profile),
    getGoals(profile),
  ])
  const savedDefaultProgramId = profile.notificationPreferences.defaultProgramId
  const defaultProgramId = programs.some((program) => program.id === savedDefaultProgramId)
    ? savedDefaultProgramId ?? ""
    : programs[0]?.id ?? ""
  const defaultProgram = programs.find((program) => program.id === defaultProgramId) ?? programs[0]

  return (
    <AppShell profile={profile} mode="admin">
      <div className="space-y-6 p-4 md:p-6">
        <PageHeader
          title="Settings"
          description="Manage the coach profile, notification preferences, and default program settings."
          actions={<AdminQuickAdd type="program" label="Add Program" />}
        />

        <Tabs defaultValue="profile">
          <TabsList className="flex h-auto flex-wrap justify-start">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="defaults">Defaults</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
              <Card>
                <CardHeader>
                  <CardTitle>Coach Profile</CardTitle>
                  <CardDescription>
                    This information appears across client-facing coaching surfaces.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form action={adminSaveSettingsAction} className="space-y-5">
                    <input type="hidden" name="settingsSection" value="profile" />
                    <input type="hidden" name="defaultProgramId" value={defaultProgramId} />
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full name</Label>
                        <Input id="fullName" name="fullName" defaultValue={profile.fullName} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="timezone">Timezone</Label>
                        <Input id="timezone" name="timezone" defaultValue={profile.timezone} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="availability">Availability</Label>
                      <Textarea
                        id="availability"
                        name="availability"
                        defaultValue={profile.availability}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio">Coach bio</Label>
                      <Textarea
                        id="bio"
                        name="bio"
                        defaultValue={profile.bio}
                        className="min-h-28"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label>Coaching specialties</Label>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {specialties.map((item) => (
                          <Label key={item} className="flex items-center gap-3 rounded-lg border p-3">
                            <Checkbox
                              name="dietaryPreferences"
                              value={item}
                              defaultChecked={profile.dietaryPreferences.includes(item)}
                            />
                            {item}
                          </Label>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Label className="flex items-center justify-between rounded-lg border p-3">
                        Email notifications
                        <input type="hidden" name="notificationEmail" value="false" />
                        <Switch name="notificationEmail" defaultChecked={profile.notificationPreferences.email} />
                      </Label>
                      <Label className="flex items-center justify-between rounded-lg border p-3">
                        SMS notifications
                        <input type="hidden" name="notificationSms" value="false" />
                        <Switch name="notificationSms" defaultChecked={profile.notificationPreferences.sms} />
                      </Label>
                    </div>
                    <Button type="submit">
                      <Save className="size-4" />
                      Save Profile
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <aside className="space-y-4">
                <Card>
                  <CardHeader>
                    <Avatar className="size-16">
                      <AvatarFallback>{initials(profile.fullName)}</AvatarFallback>
                    </Avatar>
                    <CardTitle>{profile.fullName}</CardTitle>
                    <CardDescription>{profile.email}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Badge>Coach Admin</Badge>
                    <p className="text-sm text-muted-foreground">{profile.bio}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Workspace</CardTitle>
                    <CardDescription>Current admin defaults.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <span>Primary program</span>
                      <span className="text-right text-muted-foreground">{defaultProgram?.title ?? "None selected"}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between gap-3">
                      <span>Goal templates</span>
                      <span className="text-muted-foreground">{goals.length}</span>
                    </div>
                  </CardContent>
                </Card>
              </aside>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Coach Notifications</CardTitle>
                <CardDescription>
                  Choose which operational events should reach the coach inbox.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={adminSaveSettingsAction} className="space-y-4">
                  <input type="hidden" name="fullName" value={profile.fullName} />
                  <input type="hidden" name="bio" value={profile.bio ?? "Health coach supporting balanced nutrition and sustainable fitness."} />
                  <input type="hidden" name="timezone" value={profile.timezone} />
                  <input type="hidden" name="availability" value={profile.availability} />
                  <input type="hidden" name="defaultProgramId" value={defaultProgramId} />
                  {[
                    ["notificationEmail", "Email updates", profile.notificationPreferences.email],
                    ["notificationSms", "SMS reminders", profile.notificationPreferences.sms],
                    ["notificationCalls", "Live call reminders", profile.notificationPreferences.calls],
                    ["notificationCommunity", "Community moderation", profile.notificationPreferences.community],
                  ].map(([name, label, checked]) => (
                    <Label
                      key={String(name)}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      {label}
                      <input type="hidden" name={String(name)} value="false" />
                      <Switch name={String(name)} defaultChecked={Boolean(checked)} />
                    </Label>
                  ))}
                  <Button type="submit">
                    <Save className="size-4" />
                    Save Notifications
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="defaults" className="mt-6">
            <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
              <Card>
                <CardHeader>
                  <CardTitle>Program Defaults</CardTitle>
                  <CardDescription>
                    Save the starter program and default assignment target for new clients.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form action={adminSaveSettingsAction} className="space-y-5">
                    <input type="hidden" name="fullName" value={profile.fullName} />
                    <input type="hidden" name="bio" value={profile.bio ?? "Health coach supporting balanced nutrition and sustainable fitness."} />
                    <input type="hidden" name="timezone" value={profile.timezone} />
                    <input type="hidden" name="availability" value={profile.availability} />
                    <div className="space-y-2">
                      <Label htmlFor="default-program">Default program</Label>
                      {programs.length > 0 ? (
                        <Select name="defaultProgramId" defaultValue={defaultProgramId}>
                          <SelectTrigger id="default-program">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {programs.map((program) => (
                              <SelectItem key={program.id} value={program.id}>
                                {program.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="rounded-lg border p-3 text-sm text-muted-foreground">
                          Create a program before choosing a default.
                        </p>
                      )}
                    </div>
                    <Button type="submit" disabled={programs.length === 0}>
                      <Settings className="size-4" />
                      Save Program Defaults
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="h-fit">
                <CardHeader>
                  <CardTitle>Goal Defaults</CardTitle>
                  <CardDescription>Reusable goal templates for client plans.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {goals.map((goal) => (
                    <div key={goal.id} className="rounded-lg border p-3">
                      <p className="font-medium">{goal.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {goal.targetDays} days · {goal.metric}
                      </p>
                    </div>
                  ))}
                  <AdminQuickAdd type="goal" label="Add Goal" />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="security" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Safety</CardTitle>
                <CardDescription>Manage password access and admin sign out.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <form action={passwordResetAction} className="space-y-3">
                  <Label htmlFor="email">Password reset email</Label>
                  <Input id="email" name="email" type="email" defaultValue={profile.email} required />
                  <Button type="submit" variant="outline">
                    <KeyRound className="size-4" />
                    Request Password Reset
                  </Button>
                </form>
                <Separator />
                <form action={signOutAction}>
                  <Button type="submit" variant="destructive">
                    <LogOut className="size-4" />
                    Sign Out
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}
