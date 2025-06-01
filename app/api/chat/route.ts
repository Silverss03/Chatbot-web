import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIInstance } from '@/lib/openai';
import { ChatRequestBody, ChatResponseBody } from '@/types/chat';
import { createClient } from '@/lib/supabase/server';

// Cache to avoid excessive database queries for the same user in short time periods
const userSubscriptionCache = new Map<string, {
  data: any,
  expiry: number
}>();

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
    
    // Parse request body
    const body = await request.json();
    const { messages, conversation_id } = body;
    
    // Validate input
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request. Messages array is required.' }, 
        { status: 400 }
      );
    }

    let currentConversationId = conversation_id;

    // If no conversation_id provided, create a new conversation
    if (!currentConversationId) {
      try {
        // Generate title from the first user message
        let conversationTitle = "New Conversation";
        
        // Find the first user message to use as title
        const firstUserMessage = messages.find(msg => msg.role === 'user');
        if (firstUserMessage) {
          // Use first 30 chars of message as title or full message if shorter
          conversationTitle = firstUserMessage.content.length > 30
            ? `${firstUserMessage.content.substring(0, 30)}...`
            : firstUserMessage.content;
        }

        // Create a new conversation
        const { data: newConversation, error: convError } = await supabase
          .from('conversations')
          .insert({
            user_id: user.id,
            title: conversationTitle,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (convError) {
          console.error("[API] Error creating conversation:", convError);
          // Continue without conversation tracking
        } else if (newConversation) {
          currentConversationId = newConversation.id;
          
          // Verify the new conversation exists
          const { data: checkData, error: checkError } = await supabase
            .from('conversations')
            .select('id, title')
            .eq('id', currentConversationId)
            .single();
            
          if (checkError) {
            console.error("[API] Error verifying conversation:", checkError);
          }
        }
      } catch (err) {
        console.error("[API] Failed to create new conversation:", err);
        // Continue without conversation tracking
      }
    } else {
      // Verify the conversation belongs to the user
      const { data: conversation, error } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', currentConversationId)
        .eq('user_id', user.id)
        .single();
        
      if (error || !conversation) {
        return NextResponse.json(
          { error: 'Invalid conversation ID' }, 
          { status: 403 }
        );
      }

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', currentConversationId);
    }

    // Check cache first for subscription data
    const now = Date.now();
    const cachedSubscription = userSubscriptionCache.get(user.id);
    
    let subscriptionData;
    
    if (cachedSubscription && cachedSubscription.expiry > now) {
      // Use cached data if available and not expired
      subscriptionData = cachedSubscription.data;
    } else {
      // Otherwise, query the database
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*, subscription_plans(*)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      // If no subscription found, create a default one linked to existing Starter plan
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
      } else {
        subscriptionData = subscription;
      }
      
      // Update cache with new data (valid for 5 minutes)
      userSubscriptionCache.set(user.id, {
        data: subscriptionData,
        expiry: now + 5 * 60 * 1000
      });
    }
    
    // Check for Starter tier message limit - using correct field name and path
    const planName = subscriptionData?.subscription_plans?.name || '';
    const messagesUsed = subscriptionData?.messages_used || 0;
    const messageLimit = subscriptionData?.subscription_plans?.message_limit || 10;
    
    // Check if user has exceeded limit - using strict comparison
    if (planName === 'Starter' && messagesUsed >= messageLimit) {
      return NextResponse.json(
        { 
          error: 'Đã đạt giới hạn tin nhắn. Vui lòng nâng cấp gói dịch vụ của bạn.', 
          usage: {
            current: messagesUsed,
            limit: messageLimit,
            limitReached: true
          }
        }, 
        { status: 402 }
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

    // Save user message to the conversation if we have a conversation ID
    if (currentConversationId) {
      try {
        // Find the last user message to save
        const lastUserMessage = [...messages].reverse().find(msg => msg.role === 'user');
        if (lastUserMessage) {
          const { error: msgError } = await supabase.from("messages").insert({
            conversation_id: currentConversationId,
            content: lastUserMessage.content,
            role: "user",
            created_at: new Date().toISOString(),
            user_id: user.id
          });
          
          if (msgError) {
            console.error("[API] Error saving user message:", msgError);
          }
        }
      } catch (err) {
        console.error("[API] Failed to save user message:", err);
      }
    }

    // Instead of inserting to conversations table, use chat_history
    await supabase.from('chat_history').insert({
      user_id: user.id,
      conversation_id: currentConversationId,
      messages: messages,
      response: responseMessage,
      timestamp: new Date().toISOString(),
    });
    
    // Save assistant response to conversation if we have a conversation ID
    if (currentConversationId && responseMessage) {
      try {
        const { error: msgError } = await supabase.from("messages").insert({
          conversation_id: currentConversationId,
          content: responseMessage.content || '',
          role: "assistant",
          created_at: new Date().toISOString(),
          user_id: user.id
        });
        
        if (msgError) {
          console.error("[API] Failed to save assistant message:", msgError);
        }
      } catch (err) {
        console.error("[API] Error saving assistant message:", err);
      }
    }

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
        
      // Update the cache with incremented message count
      if (userSubscriptionCache.has(user.id)) {
        const cached = userSubscriptionCache.get(user.id);
        if (cached) {
          cached.data.messages_used = newMessageCount;
          userSubscriptionCache.set(user.id, cached);
        }
      }
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
      usage: usageInfo,
      conversation_id: currentConversationId
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
