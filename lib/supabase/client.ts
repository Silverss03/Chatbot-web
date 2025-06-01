import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Cache the client instance for better performance
let cachedClient: ReturnType<typeof createClientComponentClient> | null = null;

export const createClient = () => {
  if (cachedClient) return cachedClient;

  cachedClient = createClientComponentClient({
    cookieOptions: {
      name: 'sb-auth-token',
      lifetime: 60 * 60 * 24 * 7, // 1 week
      domain: process.env.NODE_ENV === 'development' ? 'localhost' : undefined,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV !== 'development',
    }
  });
  
  return cachedClient;
};
