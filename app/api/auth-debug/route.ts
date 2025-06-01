import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const cookieList = cookieStore.getAll();
  
  // Get all cookie names and partial values (for security)
  const cookieInfo = cookieList.map(cookie => {
    const value = cookie.value;
    // Show only first and last 4 chars if value is longer than 10 chars
    const maskedValue = value.length > 10 
      ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
      : '[masked]';
    
    return {
      name: cookie.name,
      partialValue: maskedValue,
      length: value.length,
      domain: cookie.domain || 'not set',
      path: cookie.path || '/',
      expires: cookie.expires ? new Date(cookie.expires * 1000).toISOString() : 'session',
      httpOnly: cookie.httpOnly || false,
      secure: cookie.secure || false
    };
  });
  
  // Use admin client to check if we can connect to database
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
  
  const { data: dbCheck, error: dbError } = await adminClient
    .from('subscription_plans')
    .select('count(*)', { count: 'exact', head: true });
  
  return NextResponse.json({
    cookies: cookieInfo,
    hasCookies: cookieList.length > 0,
    hasAuthCookies: cookieList.some(cookie => 
      cookie.name.includes('supabase') || 
      cookie.name.includes('sb-')
    ),
    database: {
      connectionOk: !dbError,
      error: dbError?.message || null,
    },
    timestamp: new Date().toISOString()
  });
}
