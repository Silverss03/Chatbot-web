import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Use direct admin client to bypass auth completely
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Check payment_transactions table
    const { data: txnSchema, error: txnError } = await supabase
      .from('payment_transactions')
      .select()
      .limit(1);
    
    // Check subscription_plans table (plural)
    const { data: planSchemaP, error: planErrorP } = await supabase
      .from('subscription_plans')
      .select()
      .limit(1);
    
    // Check user_subscriptions table
    const { data: subSchema, error: subError } = await supabase
      .from('user_subscriptions')
      .select()
      .limit(1);
    
    return NextResponse.json({
      ngrokTesting: true,
      env: {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      tables: {
        payment_transactions: {
          exists: !txnError,
          count: txnSchema?.length || 0,
          error: txnError?.message
        },
        subscription_plans: {
          exists: !planErrorP,
          count: planSchemaP?.length || 0,
          error: planErrorP?.message
        },
        user_subscriptions: {
          exists: !subError,
          count: subSchema?.length || 0,
          error: subError?.message
        }
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Debug error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
