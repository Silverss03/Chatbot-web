import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Helper function to get Vietnam timezone (UTC+7) timestamp
const getVietnamTimestamp = () => {
  const now = new Date();
  // Add 7 hours to get Vietnam time (UTC+7)
  const vietnamTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
  return vietnamTime.toISOString();
};

export async function GET(request: NextRequest) {
  try {
    // Create a direct admin client to bypass auth completely
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const unresolvedId = searchParams.get('id');
    
    if (!unresolvedId) {
      // List all unresolved payments
      const { data: unresolved, error } = await supabaseAdmin
        .from('unresolved_payments')
        .select('*')
        .eq('status', 'unresolved')
        .order('received_at', { ascending: false });
      
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      
      return NextResponse.json({
        success: true,
        unresolvedPayments: unresolved
      });
    } else {
      // Get specific unresolved payment
      const { data: payment, error } = await supabaseAdmin
        .from('unresolved_payments')
        .select('*')
        .eq('id', unresolvedId)
        .single();
      
      if (error || !payment) {
        return NextResponse.json({ 
          success: false, 
          error: error?.message || 'Payment not found' 
        }, { status: error ? 500 : 404 });
      }
      
      // Get potential transaction matches
      const { data: potentialMatches } = await supabaseAdmin
        .from('payment_transactions')
        .select('*, user:user_id(*), plan:plan_id(*)')
        .eq('status', 'pending')
        .eq('amount', payment.amount)
        .order('created_at', { ascending: false })
        .limit(10);
      
      return NextResponse.json({
        success: true,
        payment,
        potentialMatches: potentialMatches || []
      });
    }
  } catch (error) {
    console.error('Manual payment resolution error:', error);
    return NextResponse.json({
      success: false,
      error: 'Error accessing manual payment resolution',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

// Process manual resolution
export async function POST(request: NextRequest) {
  try {
    const { unresolvedId, transactionId } = await request.json();
    
    if (!unresolvedId || !transactionId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters'
      }, { status: 400 });
    }
    
    // Create admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Get the unresolved payment
    const { data: unresolved, error: unresolvedError } = await supabaseAdmin
      .from('unresolved_payments')
      .select('webhook_data')
      .eq('id', unresolvedId)
      .single();
    
    if (unresolvedError || !unresolved) {
      return NextResponse.json({
        success: false,
        error: 'Unresolved payment not found'
      }, { status: 404 });
    }
    
    // Get the transaction
    const { data: transaction, error: txError } = await supabaseAdmin
      .from('payment_transactions')
      .select('user_id, plan_id')
      .eq('id', transactionId)
      .single();
    
    if (txError || !transaction) {
      return NextResponse.json({
        success: false,
        error: 'Transaction not found'
      }, { status: 404 });
    }
    
    const { user_id, plan_id } = transaction;
    
    // Process the subscription upgrade
    await processSubscriptionUpgrade(user_id, plan_id, supabaseAdmin);
    
    // Update transaction status
    await supabaseAdmin
      .from('payment_transactions')
      .update({
        status: 'completed',
        completed_at: getVietnamTimestamp(),
        payment_details: unresolved.webhook_data,
        bank_reference: unresolved.webhook_data.referenceCode || null,
        match_method: 'manual_resolution'
      })
      .eq('id', transactionId);
    
    // Update unresolved payment status
    await supabaseAdmin
      .from('unresolved_payments')
      .update({
        status: 'resolved',
        resolved_at: getVietnamTimestamp(),
        resolved_transaction_id: transactionId
      })
      .eq('id', unresolvedId);
    
    return NextResponse.json({
      success: true,
      message: 'Payment manually processed successfully'
    });
    
  } catch (error) {
    console.error('Manual payment processing error:', error);
    return NextResponse.json({
      success: false,
      error: 'Error processing manual payment',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Process the subscription upgrade
async function processSubscriptionUpgrade(userId: string, planId: string, supabase: any) {
  // Deactivate current subscription
  await supabase
    .from('user_subscriptions')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_active', true);
    
  // Create new subscription
  const { error } = await supabase
    .from('user_subscriptions')
    .insert({
      user_id: userId,
      plan_id: planId,
      start_date: getVietnamTimestamp(),
      is_active: true,
      messages_used: 0,
      created_at: getVietnamTimestamp(),
      updated_at: getVietnamTimestamp()
    });
  
  if (error) {
    console.error("Error upgrading subscription:", error);
    throw new Error(`Failed to upgrade subscription: ${error.message}`);
  }
}
