import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIInstance } from '@/lib/openai';
import { ChatRequestBody, ChatResponseBody } from '@/types/chat';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Get the current user to ensure they're authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }
    
    // Check if the user has an active subscription
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*, subscription_plans(*)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    // If no subscription found, create a default one linked to existing Starter plan
    let subscriptionData = subscription;
    if (subError) {
      // Use hardcoded Starter plan ID
      const starterPlanId = "a0e1238a-4f59-4d7d-8e53-082b77868f1c";
      
      // Create a default subscription - note messages_used with 's'
      const { error: insertError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          plan_id: starterPlanId,
          start_date: new Date().toISOString(),
          is_active: true,
          messages_used: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();
      
      if (insertError) {
        console.error("Error creating default subscription:", insertError);
        return NextResponse.json(
          { 
            error: 'Error setting up user subscription',
            details: insertError?.message || "Unknown database error" 
          }, 
          { status: 500 }
        );
      } else {
        // Refresh the subscription data
        const { data: newSubscription } = await supabase
          .from('user_subscriptions')
          .select('*, subscription_plans(*)')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
          
        if (newSubscription) {
          subscriptionData = newSubscription;
        } else {
          return NextResponse.json(
            { error: 'Could not retrieve subscription information' }, 
            { status: 500 }
          );
        }
      }
    }
    
    // Check for Starter tier message limit - using correct field name and path
    const planName = subscriptionData?.subscription_plans?.name || '';
    const messagesUsed = subscriptionData?.messages_used || 0;
    const messageLimit = subscriptionData?.subscription_plans?.message_limit || 10;
    
    console.log("Plan check:", { planName, messagesUsed, messageLimit });
    
    // Check if user has exceeded limit - using strict comparison
    if (planName === 'Starter' && messagesUsed >= messageLimit) {
      return NextResponse.json(
        { 
          error: 'Message limit reached. Please upgrade your subscription.', 
          usage: {
            current: messagesUsed,
            limit: messageLimit,
            limitReached: true
          }
        }, 
        { status: 402 }
      );
    }

    // Parse request body
    const body = await request.json() as ChatRequestBody;
    const { messages } = body;
    
    // Validate input
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request. Messages array is required.' }, 
        { status: 400 }
      );
    }

    // Get OpenAI client
    const openai = getOpenAIInstance();
    
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    // Extract the response
    const responseMessage = completion.choices[0].message;

    // Log conversation to database
    await supabase.from('chat_history').insert({
      user_id: user.id,
      messages: messages,
      response: responseMessage,
      timestamp: new Date().toISOString(),
    });
    
    // Update message usage count if subscription exists - using correct field name
    const newMessageCount = messagesUsed + 1;
    if (subscriptionData) {
      await supabase
        .from('user_subscriptions')
        .update({
          messages_used: newMessageCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionData.id);
    }

    // Check if this message brought user to their limit
    const isNowAtLimit = planName === 'Starter' && newMessageCount >= messageLimit;

    // Only include usage info for Starter plan
    let usageInfo = null;
    
    if (planName === 'Starter' && messageLimit > 0) {
      usageInfo = {
        current: newMessageCount,
        limit: messageLimit,
        limitReached: isNowAtLimit
      };
    }

    // Return the assistant's response with usage info only for Starter plan
    const response: ChatResponseBody = {
      message: {
        role: responseMessage.role,
        content: responseMessage.content || '',
      },
      usage: usageInfo
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Chat API error:', error);
    
    return NextResponse.json(
      { error: 'Failed to process chat request' }, 
      { status: 500 }
    );
  }
}
