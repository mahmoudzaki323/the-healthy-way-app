export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: "client" | "coach" | "admin"
          status: "invited" | "active" | "paused" | "archived"
          avatar_url: string | null
          timezone: string
          phone: string | null
          bio: string | null
          dietary_preferences: string[]
          fitness_preferences: Json
          availability: string | null
          notification_preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string
          role?: "client" | "coach" | "admin"
          status?: "invited" | "active" | "paused" | "archived"
          avatar_url?: string | null
          timezone?: string
          phone?: string | null
          bio?: string | null
          dietary_preferences?: string[]
          fitness_preferences?: Json
          availability?: string | null
          notification_preferences?: Json
        }
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      app_role: "client" | "coach" | "admin"
      content_status: "draft" | "published" | "scheduled" | "archived"
    }
  }
}
