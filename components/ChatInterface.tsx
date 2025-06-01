"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SendIcon, AlertCircle } from "lucide-react";
import { LoadingDots } from "@/components/ui/loading-dots";
import Link from 'next/link';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Bot, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import { DebugMessageViewer } from "@/components/debug/MessageViewer";

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

// Include Conversation type in props
interface ChatInterfaceProps {
  initialConversations?: Array<{
    id: string;
    title: string;
    updated_at: string;
  }>;
}

export function ChatInterface({ initialConversations = [] }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [showDebugTools, setShowDebugTools] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  
  // Add a state for sharing conversations with the sidebar
  const [conversationList, setConversationList] = useState(initialConversations);
  
  // Improved loadConversation function with better debugging
  const loadConversation = async (conversationId: string) => {
    try {
      console.log(`[ChatInterface] Loading messages for conversation: ${conversationId}`);
      setIsLoadingConversation(true);
      setMessages([]); // Clear current messages
      setError(null);
      
      if (!conversationId) {
        console.error("[ChatInterface] Invalid conversation ID:", conversationId);
        setIsLoadingConversation(false);
        return;
      }
      
      console.log(`[ChatInterface] Fetching messages with conversation_id=${conversationId}`);
      
      // Explicitly query for all columns in the messages table to ensure we get everything
      const { data, error } = await supabase
        .from("messages")
        .select("id, content, role, created_at, conversation_id, user_id")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      
      // Log raw response for debugging
      console.log("[ChatInterface] Messages query response:", {
        success: !error,
        count: data?.length || 0,
        error: error ? error.message : null
      });
      
      if (error) {
        console.error("[ChatInterface] Error loading messages:", error);
        setError(`Failed to load messages: ${error.message}`);
        return;
      }
      
      if (!data || data.length === 0) {
        console.log("[ChatInterface] No messages found for this conversation");
        // Instead of showing an error, we'll show an empty conversation
        setMessages([]);
        return;
      }
      
      console.log("[ChatInterface] Loaded messages:", data.length);
      
      // Debug: Log the first message to check its structure
      if (data.length > 0) {
        console.log("[ChatInterface] Sample message:", JSON.stringify(data[0]));
      }
      
      // Format messages for the chat interface
      const formattedMessages = data.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }));
      
      console.log("[ChatInterface] Formatted messages:", formattedMessages.length);
      setMessages(formattedMessages);
    } catch (err) {
      console.error("[ChatInterface] Failed to load conversation messages:", err);
      setError('Failed to load conversation messages');
    } finally {
      setIsLoadingConversation(false);
    }
  };
  
  // Create a new conversation
  const createNewConversation = async () => {
    try {
      setCurrentConversationId(null);
      setMessages([]);
      setInput('');
      setError(null);
    } catch (err) {
      console.error("Error creating new conversation:", err);
    }
  };
  
  // Select an existing conversation with additional logging
  const selectConversation = (conversationId: string) => {
    console.log("[ChatInterface] Selecting conversation:", conversationId);
    setCurrentConversationId(conversationId);
    
    // Log the conversation details before loading messages
    supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .single()
      .then(({ data }) => console.log("[ChatInterface] Selected conversation:", data))
      .catch(err => console.error("[ChatInterface] Error fetching conversation details:", err));
      
    // Load messages
    loadConversation(conversationId);
  };
  
  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Handle sending messages
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    if (!input.trim() || isLoading) return;
    
    const userMessage = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);
    
    try {
      // Create message history for context
      const messageHistory = [...messages, userMessage];
      
      // Add conversation_id to the API call if we're in a conversation
      const requestBody: any = { messages: messageHistory };
      if (currentConversationId) {
        requestBody.conversation_id = currentConversationId;
      }
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
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
      
      // Update current conversation ID if this was a new conversation
      if (data.conversation_id && !currentConversationId) {
        setCurrentConversationId(data.conversation_id);
      }
      
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Không thể gửi tin nhắn. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle key press for message submission
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  // Add utility to check conversations
  useEffect(() => {
    // Run one-time check of conversations
    const checkConversations = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log("[ChatInterface] No authenticated user");
          return;
        }
        
        console.log("[ChatInterface] Running conversations check for user:", user.id);
        
        // Check conversations table
        const { data, error } = await supabase
          .from('conversations')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });
          
        console.log("[ChatInterface] Conversations check result:", {
          success: !error,
          count: data?.length || 0,
          error: error || 'none'
        });
        
        if (data && data.length > 0) {
          console.log("[ChatInterface] Found conversations:", 
            data.map(c => ({ id: c.id, title: c.title, updated: c.updated_at }))
          );
        } else {
          console.log("[ChatInterface] No conversations found for user");
        }
      } catch (err) {
        console.error("[ChatInterface] Error checking conversations:", err);
      }
    };
    
    checkConversations();
  }, []);
  
  // Add explicit initialization for the conversation list
  useEffect(() => {
    const initializeChat = async () => {
      try {
        console.log("[ChatInterface] Initializing chat interface");
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log("[ChatInterface] No authenticated user found");
          return;
        }
        
        // Check if the user has any existing conversations
        console.log("[ChatInterface] Checking for existing conversations");
        const { data: conversations, error } = await supabase
          .from('conversations')
          .select('id')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1);
          
        if (error) {
          console.error("[ChatInterface] Error checking conversations:", error);
          return;
        }
        
        // If there's at least one conversation, load the most recent one
        if (conversations && conversations.length > 0) {
          console.log("[ChatInterface] Found existing conversation, loading:", conversations[0].id);
          setCurrentConversationId(conversations[0].id);
          loadConversation(conversations[0].id);
        } else {
          console.log("[ChatInterface] No existing conversations found");
        }
      } catch (err) {
        console.error("[ChatInterface] Error initializing chat:", err);
      }
    };
    
    initializeChat();
  }, []);
  
  // Add explicit function to fetch conversations that can be passed to sidebar
  const fetchConversations = async () => {
    try {
      console.log("[ChatInterface] Explicitly fetching conversations");
      
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .order("updated_at", { ascending: false });
        
      if (error) {
        console.error("[ChatInterface] Error fetching conversations:", error);
      } else if (data) {
        console.log("[ChatInterface] Fetched conversations:", data.length);
        setConversationList(data);
        return data;
      }
      
      return [];
    } catch (err) {
      console.error("[ChatInterface] Exception fetching conversations:", err);
      return [];
    }
  };
  
  // Use effect to log initialConversations on mount
  useEffect(() => {
    console.log("[ChatInterface] Mounted with initial conversations:", initialConversations.length);
    if (initialConversations.length > 0) {
      setConversationList(initialConversations);
    } else {
      fetchConversations();
    }
  }, [initialConversations]);
  
  return (
    <div className="flex h-full w-full">
      {/* Conversation Sidebar with explicit fetch function */}
      <ConversationSidebar 
        currentConversationId={currentConversationId}
        onSelectConversation={selectConversation}
        onCreateNewConversation={createNewConversation}
        initialConversations={conversationList}
        fetchConversations={fetchConversations}
      />
      
      {/* Chat Area */}
      <div className="flex-1 flex flex-col h-full min-h-[500px]" ref={chatContainerRef}>
        {/* Message display area */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoadingConversation ? (
            <div className="flex items-center justify-center h-full">
              <LoadingDots className="text-gray-400" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-400">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h2 className="text-xl font-semibold mb-2">Bắt đầu một cuộc trò chuyện mới</h2>
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
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập tin nhắn của bạn..."
              disabled={isLoading || (usage?.limitReached === true)}
              className="flex-1 resize-none border rounded-md p-2 text-sm leading-5 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[40px]"
              rows={1}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(Math.max(target.scrollHeight, 40), 200) + 'px';
              }}
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
        
        {/* Show debug tool button */}
        <div className="absolute bottom-4 right-4 z-10">
          <Button
            variant="outline"
            size="sm"
            className="opacity-50 hover:opacity-100"
            onClick={() => setShowDebugTools(!showDebugTools)}
          >
            Debug
          </Button>
        </div>
        
        {/* Debug tools */}
        {showDebugTools && (
          <div className="fixed bottom-20 right-4 z-20 bg-white shadow-lg border p-4 rounded-md w-96">
            <DebugMessageViewer conversationId={currentConversationId} />
          </div>
        )}
      </div>
    </div>
  );
}
