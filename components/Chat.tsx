"use client";

import { useState } from "react";
import { useSubscription } from '@/context/SubscriptionContext';
import {ChatInput} from "./ChatInput";

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { updateMessageCount, refreshSubscriptionInfo } = useSubscription();

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    try {
      setIsLoading(true);
      
      // Add user message to UI immediately
      const userMessage = { role: 'user', content };
      setMessages((prev) => [...prev, userMessage]);

      // Create the message history for context
      const messageHistory = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Send to API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: messageHistory }),
      });

      // Handle API response
      if (!response.ok) {
        const errorData = await response.json();
        
        // If message limit error, update subscription state
        if (response.status === 402) {
          await refreshSubscriptionInfo();
        }
        
        throw new Error(errorData.error || 'Failed to send message');
      }

      const responseData = await response.json();
      
      // Update messages with AI's response
      setMessages((prev) => [...prev, responseData.message]);
      
      // If the response includes usage info, update subscription state
      if (responseData.usage) {
        updateMessageCount(responseData.usage.current);
      } else {
        // Refresh subscription info if no usage data returned
        await refreshSubscriptionInfo();
      }

    } catch (error) {
      console.error('Error sending message:', error);
      // Show error message in UI
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Message display area */}
      <div className="flex-1 overflow-auto p-4">
        {/* ...existing message rendering code... */}
      </div>
      
      {/* Chat input area */}
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
}