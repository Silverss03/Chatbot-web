"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

interface SubscriptionState {
  tier: string;
  messageUsed: number;
  messageLimit: number;
  isLimitReached: boolean;
  updateMessageCount: (count: number) => void;
  refreshSubscriptionInfo: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionState | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [tier, setTier] = useState<string>("Starter");
  const [messageUsed, setMessageUsed] = useState<number>(0);
  const [messageLimit, setMessageLimit] = useState<number>(10);
  
  const supabase = createClientComponentClient();
  
  // Calculate if limit is reached
  const isLimitReached = tier === "Starter" && messageUsed >= messageLimit;
  
  // Function to fetch subscription data
  const refreshSubscriptionInfo = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;
      
      // Get user's subscription info
      const { data, error } = await supabase
        .from('user_subscription')
        .select('*, subscription_plan(name, message_limit)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (error || !data) {
        console.error("Error fetching subscription:", error);
        return;
      }
      
      // Update state with subscription info
      setTier(data.subscription_plan?.name || "Starter");
      setMessageUsed(data.message_used || 0);
      setMessageLimit(data.subscription_plan?.message_limit || 10);
      
    } catch (error) {
      console.error("Error in refreshing subscription:", error);
    }
  };
  
  // Function to update message count locally
  const updateMessageCount = (count: number) => {
    setMessageUsed(count);
  };
  
  // Initial fetch of subscription data
  useEffect(() => {
    refreshSubscriptionInfo();
  }, []);
  
  return (
    <SubscriptionContext.Provider value={{
      tier,
      messageUsed,
      messageLimit,
      isLimitReached,
      updateMessageCount,
      refreshSubscriptionInfo
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

// Hook to use subscription context
export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
