import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

// Default timeout in milliseconds (15 seconds)
const DEFAULT_TIMEOUT = 15000;

export async function createClient() {
  const cookieStore = await cookies();
  
  // Get custom timeout from env or use default
  const timeout = process.env.NEXT_PUBLIC_API_TIMEOUT 
    ? parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT) 
    : DEFAULT_TIMEOUT;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          const cookie = cookieStore.get(name);
          return cookie?.value;
        },
        set(name, value, options) {
          try {
            // Disable secure cookies in development
            if (process.env.NODE_ENV === 'development') {
              cookieStore.set(name, value, {
                ...options,
                secure: false,
                sameSite: "lax"
              });
            } else {
              cookieStore.set(name, value, options);
            }
          } catch (err) {
            console.error(`Error setting cookie ${name}:`, err);
          }
        },
        remove(name, options) {
          try {
            cookieStore.set(name, "", { ...options, maxAge: 0 });
          } catch (err) {
            console.error(`Error removing cookie ${name}:`, err);
          }
        },
      },
      global: {
        // Add timeout to requests to prevent hanging
        fetch: (url, fetchParams) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);
          
          // Only add signal if not already present
          const signal = fetchParams?.signal || controller.signal;
          
          const fetchWithTimeout = fetch(url, {
            ...fetchParams,
            signal
          }).finally(() => clearTimeout(timeoutId));
          
          return fetchWithTimeout;
        }
      }
    }
  )
}
