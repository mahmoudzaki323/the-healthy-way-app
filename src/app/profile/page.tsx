import { Save } from "lucide-react"

import { saveProfileAction } from "@/lib/actions"
import { getCurrentProfile } from "@/lib/auth"
import { getCoachPublicProfile, getPrograms } from "@/lib/data"
import { AppShell } from "@/components/app-shell"
import { PageHeader } from "@/components/page-header"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

export default async function ProfilePage() {
  const profile = await getCurrentProfile("client")
  const [coachProfile, programs] = await Promise.all([
    getCoachPublicProfile(),
    getPrograms(profile),
  ])
  const currentProgram = programs.find((program) => program.currentWeek)

  return (
    <AppShell profile={profile}>
      <div className="space-y-6 p-4 md:p-6">
        <PageHeader title="Profile" description="Personal info, coaching preferences, plan status, and availability." />
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <Card>
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
              <CardDescription>Your coach uses this to tailor your plan.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={saveProfileAction} className="space-y-5">
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
                <div className="space-y-3">
                  <Label>Dietary preferences</Label>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {["No restrictions", "Gluten-free", "Dairy-free", "Vegetarian", "High protein", "Meal prep"].map((item) => (
                      <Label key={item} className="flex items-center gap-3 rounded-md border p-3">
                        <Checkbox name="dietaryPreferences" value={item} defaultChecked={profile.dietaryPreferences.includes(item)} />
                        {item}
                      </Label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="availability">Availability</Label>
                  <Textarea id="availability" name="availability" defaultValue={profile.availability} required />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Label className="flex items-center justify-between rounded-md border p-3">
                    Email notifications
                    <input type="hidden" name="notificationEmail" value="false" />
                    <Switch
                      name="notificationEmail"
                      value="true"
                      defaultChecked={profile.notificationPreferences.email}
                    />
                  </Label>
                  <Label className="flex items-center justify-between rounded-md border p-3">
                    SMS notifications
                    <input type="hidden" name="notificationSms" value="false" />
                    <Switch
                      name="notificationSms"
                      value="true"
                      defaultChecked={profile.notificationPreferences.sms}
                    />
                  </Label>
                </div>
                <Button type="submit"><Save className="size-4" /> Save Profile</Button>
              </form>
            </CardContent>
          </Card>
          <aside className="space-y-4">
            <Card>
              <CardHeader>
                <Avatar className="size-16"><AvatarFallback>{profile.fullName.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                <CardTitle>{profile.fullName}</CardTitle>
                <CardDescription>{profile.email}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {currentProgram ? (
                  <>
                    <Badge>{currentProgram.title}</Badge>
                    <p className="text-sm text-muted-foreground">Week {currentProgram.currentWeek ?? 1} of {currentProgram.durationWeeks}</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No active program yet.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Your Coach</CardTitle>
                <CardDescription>{coachProfile?.fullName ?? "Coach profile pending"}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {coachProfile?.bio ?? "Your coach profile will appear here after admin setup."}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </AppShell>
  )
}
