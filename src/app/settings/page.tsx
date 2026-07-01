import { KeyRound, LogOut, Save } from "lucide-react"

import { passwordResetAction, saveSettingsAction, signOutAction } from "@/lib/actions"
import { getCurrentProfile } from "@/lib/auth"
import { AppShell } from "@/components/app-shell"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"

export default async function SettingsPage() {
  const profile = await getCurrentProfile("client")
  const notificationOptions = [
    ["notificationEmail", "Email updates", profile.notificationPreferences.email],
    ["notificationSms", "SMS reminders", profile.notificationPreferences.sms],
    ["notificationCalls", "Live call reminders", profile.notificationPreferences.calls],
    ["notificationCommunity", "Community replies", profile.notificationPreferences.community],
  ] as const

  return (
    <AppShell profile={profile}>
      <div className="space-y-6 p-4 md:p-6">
        <PageHeader title="Settings" description="Notifications, password reset, and account safety." />
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Choose what your coach can notify you about.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={saveSettingsAction} className="space-y-4">
                {notificationOptions.map(([name, label, checked]) => (
                  <Label key={name} className="flex items-center justify-between rounded-md border p-3">
                    {label}
                    <input type="hidden" name={name} value="false" />
                    <Switch name={name} value="true" defaultChecked={checked} />
                  </Label>
                ))}
                <Button type="submit"><Save className="size-4" /> Save Notifications</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Account Safety</CardTitle>
              <CardDescription>Manage access to your account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <form action={passwordResetAction} className="space-y-3">
                <Label htmlFor="email">Password reset email</Label>
                <Input id="email" name="email" type="email" defaultValue={profile.email} required />
                <Button type="submit" variant="outline"><KeyRound className="size-4" /> Request Password Reset</Button>
              </form>
              <Separator />
              <form action={signOutAction}>
                <Button type="submit" variant="destructive"><LogOut className="size-4" /> Sign Out</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
