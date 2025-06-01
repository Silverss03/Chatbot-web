import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export const createClient = () => {
  return createClientComponentClient({
    cookieOptions: {
      name: 'sb-auth-token',
      lifetime: 60 * 60 * 24 * 7, // 1 week
      domain: process.env.NODE_ENV === 'development' ? 'localhost' : undefined,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV !== 'development',
    }
  });
};
