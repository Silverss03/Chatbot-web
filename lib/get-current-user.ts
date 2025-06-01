import { createClient } from "@/lib/supabase/server"
import { getPhoneSession } from "./session"

export interface CurrentUser {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  avatar_url: string | null
  auth_type: "oauth" | "phone"
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  // First check for OAuth user
  const supabase = await createClient()
  const {
    data: { user: oauthUser },
  } = await supabase.auth.getUser()

  if (oauthUser) {
    // Get profile for OAuth user
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", oauthUser.id).single()

    return {
      id: oauthUser.id,
      full_name: profile?.full_name || oauthUser.user_metadata?.full_name || null,
      email: profile?.email || oauthUser.email || null,
      phone: profile?.phone || null,
      avatar_url: profile?.avatar_url || oauthUser.user_metadata?.avatar_url || null,
      auth_type: "oauth",
    }
  }

  // Check for phone user
  const phoneUser = await getPhoneSession()
  if (phoneUser) {
    return {
      id: phoneUser.id,
      full_name: phoneUser.full_name,
      email: null,
      phone: phoneUser.phone,
      avatar_url: null,
      auth_type: "phone",
    }
  }

  return null
}
