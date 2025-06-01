import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const redirect = url.searchParams.get('redirect') || '/login';
  
  const cookieExpirationDate = new Date(0).toUTCString();
  
  // Create response with redirect
  const response = NextResponse.redirect(new URL(redirect, request.url));
  
  // Clear all supabase-related cookies
  response.headers.append('Set-Cookie', `sb-access-token=; Path=/; expires=${cookieExpirationDate}; HttpOnly; Secure; SameSite=Lax`);
  response.headers.append('Set-Cookie', `sb-refresh-token=; Path=/; expires=${cookieExpirationDate}; HttpOnly; Secure; SameSite=Lax`);
  response.headers.append('Set-Cookie', `supabase-auth-token=; Path=/; expires=${cookieExpirationDate}; HttpOnly; Secure; SameSite=Lax`);
  response.headers.append('Set-Cookie', `supabase-user=; Path=/; expires=${cookieExpirationDate}; HttpOnly; Secure; SameSite=Lax`);
  
  // Also try clearing cookies without the security attributes in case that's an issue
  response.headers.append('Set-Cookie', `sb-access-token=; Path=/; expires=${cookieExpirationDate}`);
  response.headers.append('Set-Cookie', `sb-refresh-token=; Path=/; expires=${cookieExpirationDate}`);
  response.headers.append('Set-Cookie', `supabase-auth-token=; Path=/; expires=${cookieExpirationDate}`);
  response.headers.append('Set-Cookie', `supabase-user=; Path=/; expires=${cookieExpirationDate}`);
  
  return response;
}

// Add a POST handler that does the same thing as GET
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const redirect = url.searchParams.get('redirect') || '/login';
  
  const cookieExpirationDate = new Date(0).toUTCString();
  
  // Create response with redirect
  const response = NextResponse.redirect(new URL(redirect, request.url));
  
  // Clear all supabase-related cookies
  response.headers.append('Set-Cookie', `sb-access-token=; Path=/; expires=${cookieExpirationDate}; HttpOnly; Secure; SameSite=Lax`);
  response.headers.append('Set-Cookie', `sb-refresh-token=; Path=/; expires=${cookieExpirationDate}; HttpOnly; Secure; SameSite=Lax`);
  response.headers.append('Set-Cookie', `supabase-auth-token=; Path=/; expires=${cookieExpirationDate}; HttpOnly; Secure; SameSite=Lax`);
  response.headers.append('Set-Cookie', `supabase-user=; Path=/; expires=${cookieExpirationDate}; HttpOnly; Secure; SameSite=Lax`);
  
  // Also try clearing cookies without the security attributes in case that's an issue
  response.headers.append('Set-Cookie', `sb-access-token=; Path=/; expires=${cookieExpirationDate}`);
  response.headers.append('Set-Cookie', `sb-refresh-token=; Path=/; expires=${cookieExpirationDate}`);
  response.headers.append('Set-Cookie', `supabase-auth-token=; Path=/; expires=${cookieExpirationDate}`);
  response.headers.append('Set-Cookie', `supabase-user=; Path=/; expires=${cookieExpirationDate}`);
  
  return response;
}
