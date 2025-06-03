"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { PlusIcon, RefreshCw, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale'; // Import Vietnamese locale
import { createClient } from "@/lib/supabase/client";

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

interface ConversationSidebarProps {
  currentConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onCreateNewConversation: () => void;
  initialConversations: Conversation[];
  fetchConversations: () => Promise<any[]>;
  isVisible?: boolean;
  onToggleVisibility?: (isVisible: boolean) => void;
}

export function ConversationSidebar({
  currentConversationId,
  onSelectConversation,
  onCreateNewConversation,
  initialConversations = [],
  fetchConversations,
  isVisible = true,
  onToggleVisibility
}: ConversationSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(isVisible);
  const supabase = createClient();

  // Update internal state when prop changes
  useEffect(() => {
    setSidebarVisible(isVisible);
  }, [isVisible]);

  // Toggle sidebar visibility
  const toggleSidebar = () => {
    const newVisibility = !sidebarVisible;
    setSidebarVisible(newVisibility);
    if (onToggleVisibility) {
      onToggleVisibility(newVisibility);
    }
  };

  // Load conversations from the database
  const loadConversations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("conversations")
        .select("id, title, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
        
      if (error) {
        setError("Không thể tải cuộc trò chuyện");
        return;
      }
      
      setConversations(data || []);
    } catch (err) {
      setError("Không có cuộc trò chuyện");
    } finally {
      setIsLoading(false);
    }
  };

  // Load conversations on initial render
  useEffect(() => {
    if (initialConversations.length === 0) {
      loadConversations();
    } else {
      setConversations(initialConversations);
    }
  }, []);

  // Handle refresh button click
  const handleRefresh = async () => {
    if (fetchConversations) {
      setIsLoading(true);
      try {
        const refreshedConversations = await fetchConversations();
        if (refreshedConversations.length > 0) {
          // Use the parent's fetch conversations function
        } else {
          // Fallback to our own loading if parent's function doesn't return data
          await loadConversations();
        }
      } catch (err) {
        // Error handling is already in loadConversations
      } finally {
        setIsLoading(false);
      }
    } else {
      loadConversations();
    }
  };

  // Handle conversation selection
  const handleSelectConversation = (conversationId: string) => {
    if (onSelectConversation) {
      onSelectConversation(conversationId);
    }
  };

  // Format relative time for display in Vietnamese
  const formatRelativeTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true,
        locale: vi // Use Vietnamese locale
      });
    } catch (error) {
      return "Không xác định";
    }
  };

  // Truncate title if too long
  const truncateTitle = (title: string, maxLength: number = 25) => {
    return title.length > maxLength 
      ? title.substring(0, maxLength) + "..." 
      : title;
  };

  return (
    <div className="h-full">
      {/* Toggle button - visible when sidebar is hidden */}
      {!sidebarVisible && (
        <button 
          onClick={toggleSidebar}
          className="absolute left-0 top-1/2 -translate-y-1/2 bg-white p-2 rounded-r-md border border-l-0 shadow-md z-50"
          aria-label="Show sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
      
      {/* Sidebar with responsive styles */}
      <div 
        className={`transition-all duration-300 ease-in-out border-r bg-gray-50 flex flex-col absolute left-0 top-0 bottom-0 z-40 md:z-auto`}
        style={{
          width: sidebarVisible ? (window.innerWidth < 768 ? '100%' : '256px') : '0',
          opacity: sidebarVisible ? 1 : 0,
          overflow: sidebarVisible ? 'auto' : 'hidden',
          visibility: sidebarVisible ? 'visible' : 'hidden'
        }}
      >
        {/* Header */}
        <div className="p-4 border-b bg-white flex justify-between items-center">
          <div className="flex-1">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg">Lịch sử chat</h2>
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <Button 
              className="w-full" 
              onClick={onCreateNewConversation}
            >
              <PlusIcon className="h-4 w-4 mr-2" /> Đoạn chat mới
            </Button>
          </div>
          
          {/* Hide sidebar button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="ml-2"
            aria-label="Hide sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="p-3 m-3 text-sm bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}

          {conversations.length === 0 && !isLoading && !error ? (
            <div className="text-center p-6 text-gray-500 flex flex-col items-center">
              <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
              <p>Chưa có đoạn hội thoại nào</p>
            </div>
          ) : (
            <ul className="space-y-1 p-2">
              {conversations.map((conversation) => (
                <li key={conversation.id}>
                  <button
                    onClick={() => handleSelectConversation(conversation.id)}
                    className={`w-full text-left p-2 rounded-md text-sm transition-colors ${
                      currentConversationId === conversation.id
                        ? 'bg-blue-100 text-blue-800'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="font-medium truncate">
                      {truncateTitle(conversation.title || 'Chưa đặt tên')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatRelativeTime(conversation.updated_at)}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {isLoading && !error && (
            <div className="flex justify-center p-4">
              <div className="animate-pulse text-gray-400">Đang tải...</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}