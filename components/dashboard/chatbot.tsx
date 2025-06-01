"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import { v4 as uuidv4 } from "uuid";
import { Send, User, Bot, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChatMessage, ChatHistory } from "@/types/chat";
import { cn } from "@/lib/utils";

export function Chatbot() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatHistory>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom of chat window whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Initial greeting message
  useEffect(() => {
    if (chatHistory.length === 0) {
      setChatHistory([
        {
          id: uuidv4(),
          role: "assistant",
          content: "Hello! How can I help you today?",
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  // Auto-resize textarea properly when content changes
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Set height to 0 first to get the proper scrollHeight calculation
    textarea.style.height = "0px";

    // Set to scrollHeight to match content
    const newHeight = Math.min(
      Math.max(textarea.scrollHeight, 38), // Min height 38px
      150 // Max height 150px
    );

    textarea.style.height = `${newHeight}px`;
  }, [message]);

  // Optimize message sending with useCallback
  const handleSendMessage = useCallback(async () => {
    if (!message.trim() || isLoading) return;

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: "user",
      content: message.trim(),
      timestamp: new Date(),
    };

    setChatHistory((prev) => [...prev, userMessage]);
    setMessage("");
    setIsLoading(true);

    try {
      // Format messages for the API
      const apiMessages = chatHistory
        .concat(userMessage)
        .filter((msg) => msg.role !== "system" || msg.content.trim() !== "")
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

      // Call the API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();

      // Add assistant message to chat
      setChatHistory((prev) => [
        ...prev,
        {
          id: uuidv4(),
          role: data.message.role,
          content: data.message.content,
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error("Error sending message:", error);
      setChatHistory((prev) => [
        ...prev,
        {
          id: uuidv4(),
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again later.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [message, isLoading, chatHistory]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Memoize the chat messages to prevent unnecessary re-renders
  const ChatMessages = memo(function ChatMessages() {
    return (
      <>
        {chatHistory.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex items-start gap-3 rounded-lg p-3",
              msg.role === "user" ? "bg-blue-50 ml-12" : "bg-gray-50 mr-12"
            )}
          >
            <div
              className={cn(
                "rounded-full p-1 w-8 h-8 flex items-center justify-center",
                msg.role === "user" ? "bg-blue-100" : "bg-gray-200"
              )}
            >
              {msg.role === "user" ? (
                <User className="h-4 w-4 text-blue-700" />
              ) : (
                <Bot className="h-4 w-4 text-gray-700" />
              )}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">
                {msg.role === "user" ? "You" : "AI Assistant"}
              </div>
              <div className="mt-1 text-sm whitespace-pre-wrap">
                {msg.content}
              </div>
            </div>
          </div>
        ))}
      </>
    );
  });

  return (
    <div className="flex flex-col h-full">
      {/* Chat messages container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <ChatMessages />

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-start gap-3 rounded-lg p-3 bg-gray-50 mr-12">
            <div className="rounded-full p-1 w-8 h-8 flex items-center justify-center bg-gray-200">
              <Bot className="h-4 w-4 text-gray-700" />
            </div>
            <div className="flex items-center">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="border-t p-4">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="resize-none flex-1 min-h-[38px]"
            style={{
              height: "38px", // Initial height
              maxHeight: "150px",
              overflowY: "auto",
            }}
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            size="icon"
            className="flex-shrink-0"
            disabled={!message.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
