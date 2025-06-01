import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

// Array of paths that should bypass authentication
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/auth/callback',
  '/api/payment-webhook',
  '/api/webhook-debug'
]

// Function to check if the current path should bypass authentication
const isPublicPath = (path: string) => {
  return PUBLIC_PATHS.some(publicPath => 
    path === publicPath || 
    path.startsWith(`${publicPath}/`)
  )
}

export async function middleware(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const path = requestUrl.pathname
  
  // Skip authentication check for webhook paths
  if (path.startsWith('/api/payment-webhook') || path.startsWith('/api/webhook-debug')) {
    return NextResponse.next()
  }
  
  // For all other paths, apply standard authentication checks
  const response = NextResponse.next()
  
  try {
    // Check for cookie corruption
    const cookieHeader = request.headers.get('cookie') || ''
    if (cookieHeader.includes('supabase-auth-token')) {
      // Create middleware client
      const supabase = createMiddlewareClient({ req: request, res: response })
      
      // Attempt to get the session - if this fails due to cookie corruption,
      // we'll catch it below and handle it
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session && !isPublicPath(path)) {
        // Clear the cookies by redirecting to a special cleanup route
        return NextResponse.redirect(new URL('/auth/reset-cookies?redirect=' + encodeURIComponent(path), request.url))
      }
    }
  } catch (error) {
    console.error('Auth middleware error:', error)
    
    // If there was an error processing the auth cookies, redirect to cleanup
    return NextResponse.redirect(new URL('/auth/reset-cookies', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
