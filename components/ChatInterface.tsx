"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SendIcon, AlertCircle } from "lucide-react";
import { LoadingDots } from "@/components/ui/loading-dots";
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Bot } from "lucide-react";

// Define message type
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Usage info type
interface UsageInfo {
  current: number;
  limit: number;
  limitReached: boolean;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Handle sending messages
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    const userMessage = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);
    
    try {
      // Create message history for context
      const messageHistory = [...messages, userMessage];
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: messageHistory }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Check specifically for message limit reached
        if (response.status === 402) {
          setError('Bạn đã đạt đến giới hạn tin nhắn. Vui lòng nâng cấp gói của bạn.');
          setUsage(data.usage);
        } else {
          setError(data.error || 'Đã xảy ra lỗi khi gửi tin nhắn của bạn');
        }
        return;
      }
      
      // Add the assistant's response to messages
      if (data.message) {
        setMessages(prev => [...prev, data.message]);
      }
      
      // Store usage info if provided
      if (data.usage) {
        setUsage(data.usage);
      }
      
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Không thể gửi tin nhắn. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Message display area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <h2 className="text-xl font-semibold mb-2">Chào mừng đến với trò chuyện</h2>
              <p>Gửi một tin nhắn để bắt đầu cuộc trò chuyện.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className="flex items-start max-w-[80%] gap-2">
                  {message.role !== 'user' && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-blue-600 text-white">
                        <Bot className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={`rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white rounded-tr-none'
                        : 'bg-gray-100 text-gray-900 rounded-tl-none'
                    }`}
                  >
                    {message.content}
                  </div>
                  
                  {message.role === 'user' && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-green-600 text-white">
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>
            ))}
            
            {/* Thinking indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-start max-w-[80%] gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-blue-600 text-white">
                      <Bot className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-lg rounded-tl-none p-4 bg-gray-100 text-gray-500">
                    <LoadingDots className="opacity-70" />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Message limit reached warning */}
      {usage?.limitReached && (
        <Card className="m-4 p-4 bg-amber-50 border-amber-300">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-semibold text-amber-800">Đã đạt giới hạn tin nhắn</h3>
              <p className="text-sm text-amber-700">
                Bạn đã sử dụng {usage.current} trong số {usage.limit} tin nhắn có sẵn trong gói Starter của bạn.
              </p>
              <Link href="/subscription">
                <Button className="mt-1 bg-amber-600 hover:bg-amber-700">
                  Nâng cấp gói của bạn
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}
      
      {/* Generic error display */}
      {error && !usage?.limitReached && (
        <div className="mx-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md">
          {error}
        </div>
      )}
      
      {/* Show message usage for Starter plan */}
      {usage && !usage.limitReached && usage.limit > 0 && (
        <div className="px-4 py-1 text-xs text-gray-500">
          Tin nhắn: {usage.current}/{usage.limit}
        </div>
      )}
      
      {/* Input area */}
      <div className="border-t bg-white p-4">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nhập tin nhắn của bạn..."
            disabled={isLoading || (usage?.limitReached === true)}
            className="flex-1"
          />
          <Button 
            type="submit" 
            disabled={!input.trim() || isLoading || (usage?.limitReached === true)}
          >
            {isLoading ? (
              <LoadingDots className="text-white" />
            ) : (
              <SendIcon className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
