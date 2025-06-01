import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Simple debug endpoint to verify webhook access without authentication issues
export async function GET(request: NextRequest) {
  try {
    // Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing Supabase environment variables',
        envCheck: {
          hasSupabaseUrl: !!supabaseUrl,
          hasServiceKey: !!supabaseServiceKey && supabaseServiceKey.length > 10,
          serviceKeyFirstChars: supabaseServiceKey ? `${supabaseServiceKey.substring(0, 5)}...` : 'missing'
        }
      }, { status: 500 });
    }
    
    // Create a direct admin client to bypass auth completely
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Basic connection test
    try {
      const { error: pingError } = await supabaseAdmin.from('payment_transactions').select('count', { count: 'exact', head: true });
      
      if (pingError) {
        return NextResponse.json({
          success: false,
          error: 'Failed to connect to Supabase',
          details: pingError.message,
          hint: pingError.hint,
          timestamp: new Date().toISOString(),
        }, { status: 500 });
      }
    } catch (err) {
      return NextResponse.json({
        success: false,
        error: 'Exception while connecting to Supabase',
        details: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
      }, { status: 500 });
    }
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'pending';
    const hours = parseInt(searchParams.get('hours') || '24', 10);
    
    // Calculate the time boundary
    const timeBoundary = new Date();
    timeBoundary.setHours(timeBoundary.getHours() - hours);
    
    // Count pending transactions
    const { data, error } = await supabaseAdmin
      .from('payment_transactions')
      .select('*, user:user_id(*), plan:plan_id(*)', { count: 'exact' })
      .eq('status', status)
      .gt('created_at', timeBoundary.toISOString())
      .order('created_at', { ascending: false });
      
    // Get unresolved payments too
    const { data: unresolved } = await supabaseAdmin
      .from('unresolved_payments')
      .select('*')
      .eq('status', 'unresolved')
      .order('received_at', { ascending: false })
      .limit(10);
    
    return NextResponse.json({
      success: true,
      message: 'Webhook debug endpoint accessible',
      filter: {
        status,
        hoursAgo: hours,
        since: timeBoundary.toISOString()
      },
      pendingTransactions: data?.length || 0,
      transactions: data || [],
      unresolvedPayments: unresolved || [],
      error: error?.message,
      timestamp: new Date().toISOString(),
      noAuth: true
    });
  } catch (error) {
    console.error('Webhook debug error:', error);
    return NextResponse.json({
      success: false,
      error: 'Webhook debug error',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
