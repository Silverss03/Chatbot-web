"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function DebugMessageViewer({ conversationId }: { conversationId: string | null }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualId, setManualId] = useState<string>("");
  const supabase = createClient();
  
  const checkMessages = async (id?: string) => {
    const targetId = id || conversationId || manualId;
    
    if (!targetId) {
      setError("No conversation ID provided");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`[Debug] Manually checking messages for conversation: ${targetId}`);
      
      // Check messages table for this conversation
      const startTime = Date.now();
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", targetId);
      const queryTime = Date.now() - startTime;
        
      console.log(`[Debug] Message query completed in ${queryTime}ms`);
      
      if (error) {
        console.error("[Debug] Error fetching messages:", error);
        setError(`Query error: ${error.message}`);
      } else {
        console.log(`[Debug] Found ${data?.length || 0} messages:`, data);
        setMessages(data || []);
      }
    } catch (err: any) {
      console.error("[Debug] Exception while fetching messages:", err);
      setError(`Exception: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="border p-4 rounded-md bg-gray-50 text-xs">
      <h3 className="font-bold mb-2">Message Debug Tool</h3>
      
      <div className="flex gap-2 mb-3">
        <Input 
          placeholder="Enter conversation ID manually" 
          value={manualId} 
          onChange={e => setManualId(e.target.value)}
          className="text-xs"
        />
        <Button 
          size="sm" 
          onClick={() => checkMessages(manualId)}
          disabled={!manualId && !loading}
        >
          Check
        </Button>
      </div>
      
      <div className="mb-3">
        <p>Current Conversation ID: {conversationId || "None"}</p>
        <Button 
          size="sm" 
          onClick={() => checkMessages()}
          disabled={loading || !conversationId}
          className="mt-1"
        >
          Check Current
        </Button>
      </div>
      
      {loading && <p className="text-sm mt-2">Loading...</p>}
      {error && <p className="text-sm mt-2 text-red-500">{error}</p>}
      
      {messages.length > 0 ? (
        <div className="mt-2">
          <p className="font-medium">Found {messages.length} messages</p>
          <div className="mt-1 max-h-40 overflow-y-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-1 border">Role</th>
                  <th className="p-1 border">Content</th>
                  <th className="p-1 border">Created</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((msg) => (
                  <tr key={msg.id} className="border-b">
                    <td className="p-1 border">{msg.role}</td>
                    <td className="p-1 border truncate max-w-[200px]">{msg.content}</td>
                    <td className="p-1 border">{new Date(msg.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : messages.length === 0 && !loading && !error ? (
        <p className="italic mt-2">No messages found</p>
      ) : null}
    </div>
  );
}
