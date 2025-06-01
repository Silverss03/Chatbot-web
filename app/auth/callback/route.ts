import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { trackLogin } from "@/lib/login-tracker"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  // Default next path to "/" explicitly and log it for debugging
  const next = searchParams.get("next") || "/"
  
  // Enhanced debug logging
  console.log(`Auth callback received. Code exists: ${!!code}, Next path: '${next}'`);
  console.log(`Request URL: ${request.url}`);
  console.log(`Origin: ${origin}`);
  console.log(`NEXT_PUBLIC_SITE_URL: ${process.env.NEXT_PUBLIC_SITE_URL || 'not set'}`);

  if (code) {
    const supabase = await createClient()
    
    // Debug cookie handling
    try {
      const allCookies = request.headers.get('cookie') || '';
      console.log(`Cookie header length: ${allCookies.length}`);
      console.log(`Auth code: ${code.substring(0, 8)}...`);
    } catch (err) {
      console.error("Error logging cookie info:", err);
    }
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Create or update profile
      const profileData = {
        id: data.user.id,
        full_name: data.user.user_metadata.full_name || data.user.user_metadata.name,
        email: data.user.user_metadata.is_phone_user ? null : data.user.email, // Don't store temp email for phone users
        avatar_url: data.user.user_metadata.avatar_url,
        phone: data.user.user_metadata.phone || data.user.phone,
        updated_at: new Date().toISOString(),
      }

      // Check if profile already exists (to determine if this is a new user)
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", data.user.id)
        .single();
      
      const isNewUser = !existingProfile;
      
      // Create or update the profile
      const { error: profileError } = await supabase.from("profiles").upsert({
        ...profileData,
        created_at: isNewUser ? new Date().toISOString() : undefined,
      });

      if (profileError) {
        console.error("Error updating profile:", profileError);
      }
      
      // Log this login for ALL users, not just new ones
      await trackLogin(data.user.id, true, "OAuth callback");
      
      // For new users, set up a default subscription
      if (isNewUser) {
        // Use the hardcoded Starter plan ID instead of looking it up
        const starterPlanId = "a0e1238a-4f59-4d7d-8e53-082b77868f1c";
        
        // Create the user subscription entry - using correct table name with 's'
        const { error: subError } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: data.user.id,
            plan_id: starterPlanId,
            start_date: new Date().toISOString(),
            is_active: true,
            messages_used: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (subError) {
          console.error("Error creating starter subscription:", subError);
        }
      }

      // Get the appropriate base URL for redirecting
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin;
      console.log(`Using site URL: ${siteUrl} for redirect`);
      
      // Force redirect to home page directly rather than using 'next' parameter
      // This ensures we go to the home page after login
      const redirectUrl = `${siteUrl}/`;
      
      console.log(`Redirecting to: ${redirectUrl}`);
      
      // Use temporary redirect (307) instead of permanent (308)
      return NextResponse.redirect(redirectUrl, { status: 307 });
    } else if (error) {
      console.error("Auth error:", error);
      // Log failed login attempt
      if (data?.user?.id) {
        await trackLogin(data.user.id, false, `OAuth error: ${error.message}`);
      }
    }
  }

  // Get the site URL for error redirect
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin;
  return NextResponse.redirect(`${siteUrl}/auth/auth-code-error`);
}
