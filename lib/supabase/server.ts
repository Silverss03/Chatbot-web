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

  // Log available cookies for debugging
  const cookieList = cookieStore.getAll();
  console.log(`Available cookies (${cookieList.length}):`, cookieList.map(c => c.name).join(', '));

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          const cookie = cookieStore.get(name);
          if (!cookie) {
            console.log(`Cookie not found: ${name}`);
          } else {
            console.log(`Cookie found: ${name}, length: ${cookie.value.length}`);
          }
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
              console.log(`Cookie set (dev): ${name}, length: ${value.length}`);
            } else {
              cookieStore.set(name, value, options);
              console.log(`Cookie set (prod): ${name}, length: ${value.length}`);
            }
          } catch (err) {
            console.error(`Error setting cookie ${name}:`, err);
          }
        },
        remove(name, options) {
          try {
            cookieStore.set(name, "", { ...options, maxAge: 0 });
            console.log(`Cookie removed: ${name}`);
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
