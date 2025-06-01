"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bot, Send, User, Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  created_at: string
  conversation_id: string
  user_id: string
}

interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
  user_id: string
}

export function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const supabase = createClient()

  // Auto-scroll to latest messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const resizeTextarea = () => {
      // Reset height first to get the correct scrollHeight
      textarea.style.height = "0px";
      
      // Set the height based on content, with min/max limits
      const newHeight = Math.min(
        Math.max(textarea.scrollHeight, 38), // Min height
        150 // Max height
      );
      textarea.style.height = `${newHeight}px`;
    };
    
    // Resize when input changes
    resizeTextarea();
    
    // Also handle window resize events
    window.addEventListener('resize', resizeTextarea);
    return () => window.removeEventListener('resize', resizeTextarea);
  }, [input]); // Depend on input state to trigger resize

  useEffect(() => {
    // Get current user
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        loadConversations(user.id)
      }
    }
    getUser()
  }, [])

  const loadConversations = async (userId: string) => {
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })

    if (data) {
      setConversations(data)
      if (data.length > 0 && !currentConversation) {
        setCurrentConversation(data[0].id)
        loadMessages(data[0].id)
      }
    }
  }

  const loadMessages = async (conversationId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })

    if (data) {
      setMessages(data)
    }
  }

  const createNewConversation = useCallback(async () => {
    if (!user) return

    const { data, error } = await supabase
      .from("conversations")
      .insert({
        title: "New Conversation",
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (data && !error) {
      setCurrentConversation(data.id)
      setMessages([])
      loadConversations(user.id)
    }
  }, [user, supabase])

  const handleSend = useCallback(async () => {
    if (!input.trim() || !currentConversation || !user) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      content: input,
      role: "user",
      created_at: new Date().toISOString(),
      conversation_id: currentConversation,
      user_id: user.id,
    }

    // Add user message to database
    await supabase.from("messages").insert({
      content: input,
      role: "user",
      conversation_id: currentConversation,
      user_id: user.id,
      created_at: new Date().toISOString(),
    })

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    // Simulate bot response (replace with real AI integration)
    setTimeout(async () => {
      const botMessage: Message = {
        id: crypto.randomUUID(),
        content:
          "Thanks for your message! This is a demo response. In a real implementation, this would connect to an AI service.",
        role: "assistant",
        created_at: new Date().toISOString(),
        conversation_id: currentConversation,
        user_id: user.id,
      }

      // Add bot message to database
      await supabase.from("messages").insert({
        content: botMessage.content,
        role: "assistant",
        conversation_id: currentConversation,
        user_id: user.id,
        created_at: new Date().toISOString(),
      })

      setMessages((prev) => [...prev, botMessage])
      setIsLoading(false)

      // Update conversation timestamp
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", currentConversation)
    }, 1000)
  }, [input, currentConversation, user, setMessages, setInput, setIsLoading])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const switchConversation = useCallback((conversationId: string) => {
    setCurrentConversation(conversationId)
    loadMessages(conversationId)
  }, [loadMessages])

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Chatbot
            </CardTitle>
            <CardDescription>Get instant help and answers to your questions</CardDescription>
          </div>
          <Button onClick={createNewConversation} size="sm" variant="outline">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {conversations.length > 0 && (
          <div className="flex gap-2 overflow-x-auto">
            {conversations.slice(0, 3).map((conv) => (
              <Button
                key={conv.id}
                onClick={() => switchConversation(conv.id)}
                variant={currentConversation === conv.id ? "default" : "outline"}
                size="sm"
                className="text-xs whitespace-nowrap"
              >
                {conv.title}
              </Button>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-4">
        <ScrollArea className="flex-1 h-64">
          <div className="space-y-4 pr-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Bot className="h-8 w-8 mx-auto mb-2" />
                <p>Start a conversation!</p>
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user" ? "bg-blue-500 text-white" : "bg-muted"
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
                {message.role === "user" && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading || !currentConversation}
            className="resize-none min-h-[38px] overflow-y-auto"
            style={{
              height: "38px", // Initial height
              maxHeight: "150px",
              lineHeight: '1.5',
            }}
          />
          <Button 
            onClick={handleSend} 
            disabled={isLoading || !input.trim() || !currentConversation}
            className="flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
