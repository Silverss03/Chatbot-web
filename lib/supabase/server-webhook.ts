import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Special client for webhooks - doesn't require authentication
// Used for server-to-server communication like payment webhooks
export async function createWebhookClient() {
  return createServerComponentClient({ cookies }, {
    options: {
      db: { schema: 'public' },
      auth: { persistSession: false } // Don't try to persist session
    },
  })
}
