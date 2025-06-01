import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import type { PhoneUser } from "./phone-auth"

const SESSION_COOKIE_NAME = "phone_session"

export async function createPhoneSession(user: PhoneUser) {
  const cookieStore = await cookies()

  // Create a simple session token (in production, use JWT or similar)
  const sessionData = {
    userId: user.id,
    phone: user.phone,
    fullName: user.full_name,
    createdAt: new Date().toISOString(),
  }

  cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

export async function getPhoneSession(): Promise<PhoneUser | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

  if (!sessionCookie) {
    return null
  }

  try {
    const sessionData = JSON.parse(sessionCookie.value)

    // Verify user still exists in database
    const supabase = await createClient()
    const { data: phoneAuth } = await supabase.from("phone_auth").select("*").eq("id", sessionData.userId).single()

    if (!phoneAuth) {
      await clearPhoneSession()
      return null
    }

    return {
      id: phoneAuth.id,
      phone: phoneAuth.phone,
      full_name: phoneAuth.full_name,
      created_at: phoneAuth.created_at,
      updated_at: phoneAuth.updated_at,
    }
  } catch (error) {
    console.error("Error getting phone session:", error)
    await clearPhoneSession()
    return null
  }
}

export async function clearPhoneSession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}
