import Link from "next/link"
import { Apple, CalendarDays, Dumbbell, HeartHandshake, ShieldCheck, Users } from "lucide-react"

import { BrandMark } from "@/components/brand-mark"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const clientAreas = [
  { title: "Programs", icon: HeartHandshake, href: "/programs" },
  { title: "Recipes", icon: Apple, href: "/recipes" },
  { title: "Workouts", icon: Dumbbell, href: "/workouts" },
  { title: "Live Calls", icon: CalendarDays, href: "/live-calls" },
  { title: "Community", icon: Users, href: "/community" },
  { title: "Coach Admin", icon: ShieldCheck, href: "/admin" },
]

export default function Home() {
  return (
    <main className="min-h-svh bg-background">
      <section className="food-band min-h-[54svh] border-b">
        <div className="mx-auto flex min-h-[54svh] max-w-6xl flex-col justify-between gap-10 px-4 py-6 md:px-8">
          <nav className="flex items-center justify-between gap-4">
            <BrandMark />
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/auth">Log In</Link>
              </Button>
              <Button asChild>
                <Link href="/auth?tab=signup">Join</Link>
              </Button>
            </div>
          </nav>
          <div className="max-w-3xl pb-10 text-white">
            <Badge className="mb-4 bg-white text-primary">The Healthy Way</Badge>
            <h1 className="brand-serif text-5xl font-semibold text-white md:text-7xl">
              Healthy food, fitness, and accountability in one calm place.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-white/90">
              A coaching app for clients to follow their plan, message their coach, join live calls, and build a healthier relationship with food.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/auth?tab=signup">Create Account</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/auth">I Already Have Access</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-8 md:grid-cols-2 md:px-8 xl:grid-cols-3">
        {clientAreas.map((area) => {
          const Icon = area.icon

          return (
            <Card key={area.href}>
              <CardHeader>
                <div className="mb-3 flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <CardTitle>{area.title}</CardTitle>
                <CardDescription>Open this area after logging in with the right account role.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link href={area.href}>Open {area.title}</Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </section>
    </main>
  )
}
