import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createClient as createAdminClient } from '@supabase/supabase-js';

// Add an OPTIONS handler to support preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// Helper function to get Vietnam timezone (UTC+7) timestamp
const getVietnamTimestamp = () => {
  const now = new Date();
  // Add 7 hours to get Vietnam time (UTC+7)
  const vietnamTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
  return vietnamTime.toISOString();
};

export async function POST(request: NextRequest) {
  console.log("Payment webhook received");
  
  try {
    // Get the incoming webhook data
    const webhookData = await request.json();
    console.log("Payment webhook data:", JSON.stringify(webhookData, null, 2));
    
    // Validate required environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing required environment variables for Supabase connection");
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }
    
    // Create a direct admin client using environment variables with extended timeout
    // This completely bypasses any auth checks or middleware redirects
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          fetch: customFetchWithRetry
        }
      }
    );
    
    // Test the connection immediately to validate API key
    try {
      const { data, error } = await supabaseAdmin.from('payment_transactions').select('count', { count: 'exact', head: true });
      if (error) {
        console.error("Supabase connection test failed:", error);
        return NextResponse.json(
          { success: false, error: 'Database connection error', details: error.message },
          { status: 500 }
        );
      }
      console.log("Supabase connection test successful");
    } catch (err) {
      console.error("Failed to test Supabase connection:", err);
      return NextResponse.json(
        { success: false, error: 'Database connection error', details: err instanceof Error ? err.message : String(err) },
        { status: 500 }
      );
    }
    
    // Sample validation - in reality you would verify the payment
    // with your payment provider's signature or other authentication method
    const isValid = validatePayment(webhookData);
    
    if (!isValid) {
      console.error("Invalid payment webhook");
      return NextResponse.json({ success: false, error: 'Invalid payment data' }, { status: 400 });
    }
    
    // Extract content and description fields which might contain our reference
    const content = webhookData.content || '';
    const description = webhookData.description || '';
    const code = webhookData.code || '';
    const amount = webhookData.transferAmount || webhookData.amount || 0;
    
    // Store all potential references we've found
    const potentialRefs = [];
    let matchMethod = 'unknown';
    
    // Define multiple patterns to extract transaction references
    // Update patterns to accommodate format without hyphen
    const bankContentPattern = /-?TXN[a-zA-Z0-9]+(?=-)?/; // Match TXN with or without hyphen
    const standardPattern = /TXN-?\d+-?[a-zA-Z0-9]{8}/; // Match old format with optional hyphens
    const loosePattern = /TXN[a-zA-Z0-9-]*/; // Match any TXN followed by alphanumeric/hyphens
    
    // Extract TXN references using all patterns
    // First, try the bank-specific content pattern (highest priority)
    const bankContentMatch = content.match(bankContentPattern);
    const bankDescMatch = description.match(bankContentPattern);
    
    if (bankContentMatch) {
      // Remove the leading hyphen if present
      const cleanRef = bankContentMatch[0].replace(/^-/, '');
      potentialRefs.push({ ref: cleanRef, method: 'bank_content_format', priority: 1 });
      matchMethod = 'bank_content_format';
      console.log(`Extracted bank-format reference: ${cleanRef} from content`);
    }
    
    if (bankDescMatch) {
      const cleanRef = bankDescMatch[0].replace(/^-/, '');
      potentialRefs.push({ ref: cleanRef, method: 'bank_description_format', priority: 1 });
      if (matchMethod === 'unknown') matchMethod = 'bank_description_format';
      console.log(`Extracted bank-format reference: ${cleanRef} from description`);
    }
    
    // Try to extract from code directly (highest priority for exact match)
    if (code && code.includes('TXN')) {
      potentialRefs.push({ ref: code, method: 'code_field', priority: 1 });
      if (matchMethod === 'unknown') matchMethod = 'code_field';
    }
    
    // 1. Standard pattern in content/description
    const contentStandardMatch = content.match(standardPattern);
    const descriptionStandardMatch = description.match(standardPattern);
    
    if (contentStandardMatch) {
      potentialRefs.push({ ref: contentStandardMatch[0], method: 'content_standard', priority: 2 });
      if (matchMethod === 'unknown') matchMethod = 'content_standard';
    }
    
    if (descriptionStandardMatch) {
      potentialRefs.push({ ref: descriptionStandardMatch[0], method: 'description_standard', priority: 2 });
      if (matchMethod === 'unknown') matchMethod = 'description_standard';
    }
    
    // 2. Looser pattern in content/description
    const contentLooseMatch = content.match(loosePattern);
    const descriptionLooseMatch = description.match(loosePattern);
    
    if (contentLooseMatch) {
      // Don't add duplicate references
      const ref = contentLooseMatch[0];
      if (!potentialRefs.some(item => item.ref === ref)) {
        potentialRefs.push({ ref, method: 'content_loose', priority: 3 });
        if (matchMethod === 'unknown') matchMethod = 'content_loose';
      }
    }
    
    if (descriptionLooseMatch) {
      const ref = descriptionLooseMatch[0];
      if (!potentialRefs.some(item => item.ref === ref)) {
        potentialRefs.push({ ref, method: 'description_loose', priority: 3 });
        if (matchMethod === 'unknown') matchMethod = 'description_loose';
      }
    }
    
    // Also try to extract TXN references from content/description by splitting on hyphens or spaces
    const contentParts = content.split(/[-\s]/);
    const descriptionParts = description.split(/[-\s]/);
    
    for (const part of contentParts) {
      if (part.includes('TXN') && !potentialRefs.some(item => item.ref === part)) {
        potentialRefs.push({ ref: part, method: 'content_part', priority: 4 });
        console.log(`Found TXN in content part: ${part}`);
      }
    }
    
    for (const part of descriptionParts) {
      if (part.includes('TXN') && !potentialRefs.some(item => item.ref === part)) {
        potentialRefs.push({ ref: part, method: 'description_part', priority: 4 });
        console.log(`Found TXN in description part: ${part}`);
      }
    }
    
    // 4. Fallbacks to other webhook fields
    if (webhookData.transaction_reference && !potentialRefs.some(item => item.ref === webhookData.transaction_reference)) {
      potentialRefs.push({ ref: webhookData.transaction_reference, method: 'transaction_reference_field', priority: 5 });
    }
    
    if (webhookData.referenceCode && !potentialRefs.some(item => item.ref === webhookData.referenceCode)) {
      potentialRefs.push({ ref: webhookData.referenceCode, method: 'reference_code_field', priority: 5 });
    }
    
    // Sort references by priority (lower number = higher priority)
    potentialRefs.sort((a, b) => a.priority - b.priority);
    
    // Log all potential references for debugging
    console.log("Found potential references:", JSON.stringify(potentialRefs, null, 2));
    
    // Try to find a transaction match using all potential references
    let transaction = null;
    
    // First try each reference with exact matches
    for (const { ref, method } of potentialRefs) {
      try {
        console.log(`Trying exact match with reference '${ref}' (method: ${method})`);
        const { data, error } = await supabaseAdmin
          .from('payment_transactions')
          .select('*, user_id, plan_id')
          .eq('reference', ref)
          .eq('status', 'pending')
          .limit(1);
        
        if (error) {
          console.warn(`Database error during exact match for '${ref}':`, error);
          continue;
        }
        
        if (data && data.length > 0) {
          transaction = data[0];
          matchMethod = `exact_match_${method}`;
          console.log(`Found transaction with exact match for '${ref}'`);
          break;
        }
      } catch (err) {
        console.error(`Error trying exact match for '${ref}':`, err);
      }
    }
    
    // If no exact match, try partial matches
    if (!transaction) {
      for (const { ref, method } of potentialRefs) {
        try {
          console.log(`Trying partial match with reference '${ref}' (method: ${method})`);
          
          // Skip very short references to avoid false matches
          if (ref.length < 5) {
            console.log(`Reference '${ref}' too short for partial matching`);
            continue;
          }
          
          const { data, error } = await supabaseAdmin
            .from('payment_transactions')
            .select('*, user_id, plan_id')
            .ilike('reference', `%${ref}%`)
            .eq('status', 'pending')
            .limit(1);
          
          if (error) {
            console.warn(`Database error during partial match for '${ref}':`, error);
            continue;
          }
          
          if (data && data.length > 0) {
            transaction = data[0];
            matchMethod = `partial_match_${method}`;
            console.log(`Found transaction with partial match for '${ref}'`);
            break;
          }
        } catch (err) {
          console.error(`Error trying partial match for '${ref}':`, err);
        }
      }
    }
    
    // Try partial match with our internal TXN prefix
    if (!transaction) {
      // Try a broader partial match just looking for TXN pattern
      try {
        console.log("Trying broader pattern match for any TXN");
        const { data, error } = await supabaseAdmin
          .from('payment_transactions')
          .select('*, user_id, plan_id')
          .ilike('reference', 'TXN%')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (error) {
          console.warn('Database error during TXN prefix match:', error);
        } else if (data && data.length > 0) {
          // If we have multiple matches, try to find the best one based on amount
          const amountMatches = data.filter(tx => tx.amount === amount);
          if (amountMatches.length > 0) {
            transaction = amountMatches[0]; // Take the most recent with matching amount
            matchMethod = 'txn_prefix_amount_match';
          } else {
            transaction = data[0]; // Take the most recent if no amount match
            matchMethod = 'txn_prefix_match';
          }
          console.log(`Found transaction with TXN prefix match: ${transaction.reference}`);
        }
      } catch (err) {
        console.error('Error trying TXN prefix match:', err);
      }
    }
    
    // If still not found, try to match by amount and recency
    if (!transaction) {
      try {
        console.log("No match by reference, trying match by amount:", amount);
        // Get pending transactions with matching amount in the last 24 hours
        const dayAgo = new Date();
        dayAgo.setHours(dayAgo.getHours() - 24);
        
        const { data, error } = await supabaseAdmin
          .from('payment_transactions')
          .select('*, user_id, plan_id')
          .eq('amount', amount)
          .eq('status', 'pending')
          .gt('created_at', dayAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (error) {
          console.warn(`Database error during amount match:`, error);
        } else if (data && data.length > 0) {
          transaction = data[0];
          matchMethod = 'amount_match';
          console.log(`Found transaction with amount match for ${amount}`);
        }
      } catch (err) {
        console.error(`Error trying amount match:`, err);
      }
    }
    
    // If no match found, save the webhook data for manual resolution
    if (!transaction) {
      try {
        console.log("No transaction match found, saving for manual resolution");
        
        const { data, error } = await supabaseAdmin
          .from('unresolved_payments')
          .insert({
            webhook_data: webhookData,
            potential_references: potentialRefs,
            amount: amount,
            received_at: getVietnamTimestamp(),
            status: 'unresolved'
          })
          .select('id');
          
        if (error) {
          console.error("Error saving unresolved payment:", error);
        }
        
        return NextResponse.json(
          { 
            success: false, 
            error: 'Transaction not found after multiple matching attempts', 
            potentialReferences: potentialRefs,
            amount: amount,
            matchMethod,
            webhookData: {
              content,
              description,
              code,
              referenceCode: webhookData.referenceCode
            },
            saved: !error,
            unresolvedId: data?.[0]?.id
          }, 
          { status: 404 }
        );
      } catch (err) {
        console.error("Failed to save unresolved payment:", err);
      }
    }
    
    // Process the matched transaction
    try {
      const { user_id, plan_id } = transaction;
      
      if (!user_id || !plan_id) {
        console.error("Missing user or plan ID in transaction record");
        return NextResponse.json(
          { success: false, error: 'Invalid transaction data' }, 
          { status: 400 }
        );
      }
      
      console.log(`Processing subscription upgrade for user ${user_id} to plan ${plan_id}`);
      
      // Get plan name for success message
      const { data: planData } = await supabaseAdmin
        .from('subscription_plans')
        .select('name')
        .eq('id', plan_id)
        .single();
      
      // Save the bank's reference code to our transaction for future reference
      await supabaseAdmin
        .from('payment_transactions')
        .update({
          bank_reference: webhookData.referenceCode || null,
          webhook_received_at: getVietnamTimestamp(),
          match_method: matchMethod
        })
        .eq('id', transaction.id);
      
      // Process the subscription upgrade using admin client
      await processSubscriptionUpgrade(user_id, plan_id, supabaseAdmin);
      
      // Update transaction status
      await supabaseAdmin
        .from('payment_transactions')
        .update({
          status: 'completed',
          completed_at: getVietnamTimestamp(),
          payment_details: webhookData
        })
        .eq('id', transaction.id);
      
      console.log(`Payment successfully processed for transaction ${transaction.reference}`);
      
      return NextResponse.json({
        success: true,
        message: 'Payment processed successfully',
        transactionId: transaction.id,
        planName: planData?.name || 'Pro',
        matchMethod
      });
    } catch (err) {
      console.error("Error processing matched transaction:", err);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Error processing transaction',
          details: err instanceof Error ? err.message : String(err)
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Payment webhook error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process payment webhook',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// This would be replaced with actual validation logic
function validatePayment(webhookData: any): boolean {
  // In production, you would verify the signature or authentication token
  // from your payment provider
  return true; // For demonstration purposes
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

// Custom fetch with retry logic for database connections
async function customFetchWithRetry(...args: Parameters<typeof fetch>): Promise<Response> {
  let lastError: Error | null = null;
  const maxRetries = 3;
  const timeoutMs = 10000; // 10 seconds timeout
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`Database fetch attempt ${attempt + 1}/${maxRetries}`);
      // Use AbortController to implement timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      try {
        // Use the signal from AbortController to enable timeout
        const options = args[1] || {};
        const newOptions = {
          ...options,
          signal: controller.signal
        };
        const newArgs = [args[0], newOptions] as Parameters<typeof fetch>;
        
        const response = await fetch(...newArgs);
        clearTimeout(timeoutId); // Clear timeout on success
        return response;
      } finally {
        clearTimeout(timeoutId); // Make sure timeout is cleared
      }
    } catch (err) {
      lastError = err as Error;
      console.warn(`Fetch attempt ${attempt + 1} failed:`, err);
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  throw lastError || new Error('Failed to fetch after multiple attempts');
}
