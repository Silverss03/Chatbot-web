import { createClient } from "@/lib/supabase/server"
import bcrypt from "bcryptjs"

export interface PhoneUser {
  id: string
  phone: string
  full_name: string
  created_at: string
  updated_at: string
}

export async function createPhoneUser(phone: string, password: string, fullName: string): Promise<PhoneUser | null> {
  const supabase = await createClient()

  try {
    // Check if phone already exists
    const { data: existing } = await supabase.from("phone_auth").select("id").eq("phone", phone).single()

    if (existing) {
      throw new Error("Phone number already registered")
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create phone auth record
    const { data: phoneAuth, error } = await supabase
      .from("phone_auth")
      .insert({
        phone,
        password_hash: passwordHash,
        full_name: fullName,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    // Create profile record
    await supabase.from("profiles").insert({
      id: phoneAuth.id,
      full_name: fullName,
      phone,
      email: null,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    return {
      id: phoneAuth.id,
      phone: phoneAuth.phone,
      full_name: phoneAuth.full_name,
      created_at: phoneAuth.created_at,
      updated_at: phoneAuth.updated_at,
    }
  } catch (error) {
    console.error("Error creating phone user:", error)
    return null
  }
}

export async function verifyPhoneUser(phone: string, password: string): Promise<PhoneUser | null> {
  const supabase = await createClient()

  try {
    // Get phone auth record
    const { data: phoneAuth, error } = await supabase.from("phone_auth").select("*").eq("phone", phone).single()

    if (error || !phoneAuth) {
      return null
    }

    // Verify password
    const isValid = await bcrypt.compare(password, phoneAuth.password_hash)

    if (!isValid) {
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
    console.error("Error verifying phone user:", error)
    return null
  }
}
