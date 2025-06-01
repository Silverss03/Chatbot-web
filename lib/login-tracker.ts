import { createClient } from "@/lib/supabase/server";

export async function trackLogin(userId: string, success: boolean = true, details?: string) {
  try {
    const supabase = await createClient();
    
    // Create timestamp for Vietnam timezone (UTC+7)
    const now = new Date();
    const vietnamTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    const vietnamTimestamp = vietnamTime.toISOString();
    
    console.log(`Logging login for user ${userId}, success: ${success}, time: ${vietnamTimestamp}`);
    
    const { error } = await supabase.from("login_history").insert({
      user_id: userId,
      login_timestamp: vietnamTimestamp,
      login_success: success,
    });
    
    if (error) {
      console.error("Error logging login history:", error);
      
      // Debug table structure
      const { data: tableInfo, error: tableError } = await supabase
        .from('login_history')
        .select()
        .limit(0);
        
      if (tableError) {
        console.error("Table might not exist:", tableError);
      } else {
        console.log("Table exists with structure:", tableInfo ? "[]" : "null");
      }
    } else {
      console.log("Login history recorded successfully");
    }
    
  } catch (error) {
    console.error("Failed to track login:", error);
  }
}
