export interface Profile {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  phone: string | null
  created_at: string
  updated_at: string
}

export interface LoginHistory {
  id: string
  user_id: string
  login_timestamp: string
  login_success: boolean
}
