import { Gift, KeyRound, Leaf, Mail } from "lucide-react"

import {
  magicLinkAction,
  passwordResetAction,
  signInAction,
  signUpAction,
} from "@/lib/actions"
import { BrandMark } from "@/components/brand-mark"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function AuthPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = searchParams ? await searchParams : {}
  const error = typeof params.error === "string" ? params.error : ""
  const sent = typeof params.sent === "string" ? params.sent : ""
  const initialTab = params.tab === "signup" ? "signup" : "signin"

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1fr_1.05fr]">
      <section className="food-band relative hidden overflow-hidden border-r lg:flex lg:flex-col lg:justify-between">
        <div className="p-10">
          <BrandMark />
        </div>
        <div className="mx-10 mb-12 bg-primary/90 px-10 py-12 text-primary-foreground">
          <h1 className="brand-serif text-5xl leading-tight">The Healthy Way</h1>
          <p className="mt-5 max-w-md text-lg">
            Wellness coaching for real life: food freedom, strength, consistency,
            and support that fits into your week.
          </p>
        </div>
      </section>
      <section className="flex items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-xl">
          <div className="mb-8 lg:hidden">
            <BrandMark />
          </div>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Authentication needs attention</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {sent && (
            <Alert className="mb-4">
              <Mail className="size-4" />
              <AlertTitle>Check your email</AlertTitle>
              <AlertDescription>
                {sent === "magic-link"
                  ? "Your magic link has been sent."
                  : "Password reset instructions have been sent."}
              </AlertDescription>
            </Alert>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">Welcome back</CardTitle>
              <CardDescription>
                Sign in, create your client account, or request a secure link.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={initialTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Create account</TabsTrigger>
                </TabsList>
                <TabsContent value="signin" className="mt-6 space-y-6">
                  <form action={signInAction} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        name="email"
                        type="email"
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <Input
                        id="signin-password"
                        name="password"
                        type="password"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      <KeyRound className="size-4" />
                      Sign in
                    </Button>
                  </form>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <form action={magicLinkAction} className="space-y-2">
                      <Label htmlFor="magic-email">Magic link email</Label>
                      <Input id="magic-email" name="email" type="email" placeholder="you@example.com" required />
                      <Button type="submit" variant="outline" className="w-full">
                        <Mail className="size-4" />
                        Send magic link
                      </Button>
                    </form>
                    <form action={passwordResetAction} className="space-y-2">
                      <Label htmlFor="reset-email">Reset email</Label>
                      <Input id="reset-email" name="email" type="email" placeholder="you@example.com" required />
                      <Button type="submit" variant="outline" className="w-full">
                        Reset password
                      </Button>
                    </form>
                  </div>
                </TabsContent>
                <TabsContent value="signup" className="mt-6">
                  <form action={signUpAction} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">Name</Label>
                        <Input id="signup-name" name="fullName" placeholder="Your name" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="invite-code">Invite code</Label>
                        <div className="relative">
                          <Gift className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="invite-code"
                            name="inviteCode"
                            className="pl-9"
                            placeholder="Invite code"
                            required
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input id="signup-email" name="email" type="email" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input id="signup-password" name="password" type="password" minLength={8} required />
                    </div>
                    <Button type="submit" className="w-full">
                      <Leaf className="size-4" />
                      Create account
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
              <Separator className="my-6" />
              <p className="text-center text-sm text-muted-foreground">
                New here? Create an account to get routed into onboarding, then
                your coaching dashboard. Coach admin access is controlled by the
                coach account role.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  )
}
