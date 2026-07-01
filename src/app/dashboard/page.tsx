import { AppShell } from "@/components/app-shell"
import { getCurrentProfile } from "@/lib/auth"
import { getDashboardData } from "@/lib/data"
import { DashboardClient } from "@/features/dashboard/dashboard-client"

export default async function DashboardPage() {
  const profile = await getCurrentProfile("client")
  const data = await getDashboardData(profile)

  return (
    <AppShell profile={profile}>
      <DashboardClient
        profile={profile}
        events={data.events}
        stats={data.stats}
        goals={data.goals}
        recipes={data.recipes}
        workouts={data.workouts}
      />
    </AppShell>
  )
}
