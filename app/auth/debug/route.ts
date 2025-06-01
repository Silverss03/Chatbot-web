import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({
        error: 'Email parameter is required'
      }, { status: 400 });
    }
    
    // Create admin client to check user
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
    
    // Check if user exists in auth
    const { data: authUser, error: authError } = await adminClient.auth.admin.getUserByEmail(email);
    
    // Check if user exists in profiles table
    const { data: profileData, error: profileError } = await adminClient
      .from('profiles')
      .select('id, email, full_name, created_at')
      .eq('email', email)
      .maybeSingle();
    
    return NextResponse.json({
      success: true,
      authCheck: {
        exists: !!authUser?.user,
        error: authError?.message || null,
        user: authUser?.user ? {
          id: authUser.user.id,
          email: authUser.user.email,
          emailConfirmed: authUser.user.email_confirmed_at !== null,
          createdAt: authUser.user.created_at,
          lastSignIn: authUser.user.last_sign_in_at,
          userMetadata: authUser.user.user_metadata,
        } : null
      },
      profileCheck: {
        exists: !!profileData,
        error: profileError?.message || null,
        profile: profileData || null
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Error checking user',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
