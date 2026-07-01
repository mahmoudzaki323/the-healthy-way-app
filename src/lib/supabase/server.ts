import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

import { requireSupabaseEnv } from "../env"

export async function createClient() {
  const env = requireSupabaseEnv()
  const cookieStore = await cookies()

  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Server Components cannot set cookies. Middleware handles refreshes.
        }
      },
    },
  })
}
