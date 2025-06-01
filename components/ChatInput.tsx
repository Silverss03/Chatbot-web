"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendIcon } from "lucide-react";
import { useSubscription } from '@/context/SubscriptionContext';
import Link from 'next/link';

interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
}

export function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isLimitReached, tier, messageUsed, messageLimit } = useSubscription();
  
  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Reset height to get correct scrollHeight
    textarea.style.height = "0px";
    
    // Calculate new height based on content
    const newHeight = Math.min(
      Math.max(textarea.scrollHeight, 38), // Minimum height
      150 // Maximum height
    );
    
    textarea.style.height = `${newHeight}px`;
  }, [message]); // Depend on message to trigger resize
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading && !isLimitReached) {
      const currentMessage = message;
      setMessage('');
      // Reset height of textarea after clearing message
      if (textareaRef.current) {
        textareaRef.current.style.height = "38px";
      }
      await onSendMessage(currentMessage);
    }
  };
  
  return (
    <div className="border-t bg-white p-4">
      {isLimitReached ? (
        <div className="bg-amber-50 border border-amber-200 p-4 mb-4 rounded-md">
          <p className="text-amber-800 mb-2">
            You've reached your message limit ({messageUsed}/{messageLimit}) on the {tier} plan.
          </p>
          <Link href="/subscription">
            <Button className="bg-amber-600 hover:bg-amber-700">
              Upgrade Your Plan
            </Button>
          </Link>
        </div>
      ) : tier === "Starter" && (
        <div className="text-xs text-gray-500 mb-2">
          Messages remaining: {messageLimit - messageUsed} of {messageLimit}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          placeholder="Type your message here..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1 min-h-[38px] overflow-y-auto"
          style={{
            height: "38px", // Initial height
            maxHeight: "150px",
            lineHeight: '1.5'
          }}
          disabled={isLoading || isLimitReached}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <Button 
          type="submit" 
          disabled={!message.trim() || isLoading || isLimitReached}
        >
          <SendIcon className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
