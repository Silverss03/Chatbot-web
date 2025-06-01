import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Cache client for performance
let cachedClient: ReturnType<typeof createClientComponentClient> | null = null;

export const createClient = () => {
  if (cachedClient) return cachedClient;

  console.log("[Supabase Client] Creating new Supabase client");
  
  cachedClient = createClientComponentClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    options: {
      db: {
        schema: 'public',
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    }
  });
  
  return cachedClient;
};
