import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next")
  const redirectTo = next && next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/dashboard"

  if (code) {
    const supabase = await createClient()
    const { data } = await supabase.auth.exchangeCodeForSession(code)
    if (!next && data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle()

      if (profile?.role === "coach" || profile?.role === "admin") {
        return NextResponse.redirect(new URL("/admin", request.url))
      }
    }
  }

  return NextResponse.redirect(new URL(redirectTo, request.url))
}
