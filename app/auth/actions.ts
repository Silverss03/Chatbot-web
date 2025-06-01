"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { trackLogin } from "@/lib/login-tracker"
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function signInWithGoogle() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`,
    },
  })

  if (error) {
    console.error("Error signing in with Google:", error)
    redirect("/error")
  }

  if (data.url) {
    redirect(data.url)
  }
}

export async function signInWithFacebook() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "facebook",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`,
    },
  })

  if (error) {
    console.error("Error signing in with Facebook:", error)
    redirect("/error")
  }

  if (data.url) {
    redirect(data.url)
  }
}

export async function signUpWithPhone(formData: FormData) {
  const supabase = await createClient()
  
  const phone = formData.get("phone") as string
  const password = formData.get("password") as string
  const fullName = formData.get("fullName") as string
  const email = formData.get("email") as string

  try {
    console.log("Attempting to sign up user with:", { email, phone, fullName })
    
    // Validate password
    if (!password || password.length < 6) {
      console.error("Password validation failed: too short or empty");
      return { success: false, redirectTo: "/error?type=validation&message=Mật+khẩu+phải+có+ít+nhất+6+ký+tự" };
    }
    
    // Normalize email to lowercase to avoid case-sensitivity issues
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if user already exists
    const { data: existingUserData, error: existingUserError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', normalizedEmail)
      .maybeSingle();
    
    if (existingUserData) {
      console.log("User with this email already exists in profiles table");
      return { success: false, redirectTo: "/error?type=auth&message=Email+này+đã+được+đăng+ký.+Vui+lòng+đăng+nhập." };
    }
    
    console.log("Creating new user with Supabase Auth...");

    // Create user with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone,
          is_phone_user: true,
        },
      },
    });

    if (error) {
      console.error("Error signing up with Supabase Auth:", error);
      
      if (error.message.includes('already registered')) {
        return { success: false, redirectTo: "/error?type=auth&message=Địa+chỉ+email+này+đã+được+đăng+ký.+Vui+lòng+đăng+nhập." };
      }
      
      return { success: false, redirectTo: `/error?type=auth&message=${encodeURIComponent(error.message)}` };
    }

    if (!data.user) {
      console.error("No user returned from signUp");
      return { success: false, redirectTo: "/error?type=auth&message=Không+thể+tạo+tài+khỏan.+Vui+lòng+thử+lại+sau." };
    }

    // Log success of auth creation
    console.log("User successfully created in Auth with ID:", data.user.id);
    console.log("Auth session created:", !!data.session);

    // Create profile with user information
    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      full_name: fullName,
      email: normalizedEmail, // Use normalized email
      phone: phone,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    if (profileError) {
      console.error("Error creating profile:", profileError);
      return { success: false, redirectTo: "/error?type=database&message=Không+thể+tạo+hồ+sơ+người+dùng" };
    }
    
    console.log("User profile created successfully");
    
    // Create default subscription
    const starterPlanId = "a0e1238a-4f59-4d7d-8e53-082b77868f1c"; // Starter plan ID
    
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
      console.error("Error creating subscription:", subError);
    } else {
      console.log("Default subscription created successfully");
    }
    
    // Log the login attempt
    await logLoginAttempt(data.user.id, true);
    
    // If no session was created, might need email verification
    if (!data.session) {
      console.log("No session created - user might need to verify email");
      return { success: true, redirectTo: `/signup-confirm?email=${encodeURIComponent(normalizedEmail)}` };
    }

    console.log("Authentication successful, redirecting to home");
    revalidatePath("/", "layout");
    return { success: true, redirectTo: "/" };
  } catch (e) {
    console.error("Exception in sign up:", e);
    return { success: false, redirectTo: "/error?type=unknown&message=Đã+xảy+ra+lỗi+không+xác+định+khi+đăng+ký" };
  }
}

export async function signInWithPhone(formData: FormData) {
  const supabase = await createClient()

  try {
    const phone = formData.get("phone") as string
    const password = formData.get("password") as string
    const email = formData.get("email") as string

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    
    console.log(`Attempting login with email: ${normalizedEmail}`);

    // Try login directly without race condition
    const result = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    
    const { data, error } = result;
    
    if (error) {
      console.error("Login failed:", error);
      
      if (error.message.includes('Invalid login credentials')) {
        // Use a simpler approach - redirect to a new page with URL params, not using redirect()
        return { success: false, redirectTo: "/error?type=auth&message=Email+hoặc+mật+khẩu+không+chính+xác" };
      } else if (error.message.includes('Email not confirmed')) {
        return { success: false, redirectTo: "/error?type=auth&message=Email+chưa+được+xác+nhận.+Vui+lòng+kiểm+tra+hộp+thư+của+bạn." };
      }
      
      return { success: false, redirectTo: `/error?type=auth&message=${encodeURIComponent(error.message)}` };
    }

    if (!data?.user) {
      console.error("Sign-in succeeded but no user returned");
      return { success: false, redirectTo: "/error?type=auth&message=Đăng+nhập+không+thành+công.+Vui+lòng+thử+lại." };
    }
    
    console.log("User authenticated successfully:", data.user.id);

    // Update user metadata and profile
    try {
      // Update user metadata
      await supabase.auth.updateUser({
        data: { 
          is_phone_user: true,
          phone: phone
        }
      });
      
      // Update profile phone number
      await supabase.from("profiles").upsert({
        id: data.user.id,
        phone: phone,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
      
      await trackLogin(data.user.id, true, "Phone signin");
    } catch (updateError) {
      // Non-critical, just log the error
      console.warn("Could not update user metadata but continuing:", updateError);
    }

    revalidatePath("/", "layout");
    
    // Instead of calling redirect() directly which can cause header issues,
    // return a success response with redirect destination
    return { success: true, redirectTo: "/" };
  } catch (e) {
    console.error("Error in phone signin:", e);
    return { success: false, redirectTo: "/error?type=connection&message=Yêu+cầu+xác+thực+thất+bại+do+vấn+đề+kết+nối" };
  }
}

export async function resetCookies() {
  'use server';
  
  // Note: We can't directly manipulate cookies in server actions
  // So we'll redirect to our cookie reset route
  redirect('/auth/reset-cookies');
}

export async function signOut() {
  'use server';
  
  const supabase = await createClient();

  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Error signing out:", error);
      // If there's an error signing out, redirect directly to login
      redirect('/login?error=signout-failed');
    }

    // Clear cookies with a GET request to ensure it works
    redirect('/auth/reset-cookies?redirect=/login');
  } catch (e) {
    console.error("Exception during sign out:", e);
    // On any error, go directly to login
    redirect('/login?error=exception');
  }
}

async function logLoginAttempt(userId: string, success: boolean) {
  const supabase = await createClient()

  // Create timestamp for Vietnam timezone (UTC+7)
  const now = new Date();
  // Add 7 hours to get Vietnam time
  const vietnamTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
  const vietnamTimestamp = vietnamTime.toISOString();

  const { error } = await supabase.from("login_history").insert({
    user_id: userId,
    login_timestamp: vietnamTimestamp,
    login_success: success,
  })

  if (error) {
    console.error("Error logging login attempt:", error)
  }
}
