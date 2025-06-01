export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          avatar_url: string | null;
          phone: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      subscription_plans: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price: number;
          message_limit: number;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          price: number;
          message_limit: number;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          message_limit?: number;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      user_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string;
          start_date: string;
          is_active: boolean;
          messages_used: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_id: string;
          start_date: string;
          is_active: boolean;
          messages_used: number;
          created_at: string;
          updated_at: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan_id?: string;
          start_date?: string;
          is_active?: boolean;
          messages_used?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      payment_transactions: {
        Row: {
          id: string;
          reference: string;
          user_id: string;
          plan_id: string;
          amount: number;
          status: string;
          created_at: string;
          completed_at: string | null;
          payment_details: any | null;
        };
        Insert: {
          id?: string;
          reference: string;
          user_id: string;
          plan_id: string;
          amount: number;
          status?: string;
          created_at: string;
          completed_at?: string | null;
          payment_details?: any | null;
        };
        Update: {
          id?: string;
          reference?: string;
          user_id?: string;
          plan_id?: string;
          amount?: number;
          status?: string;
          created_at?: string;
          completed_at?: string | null;
          payment_details?: any | null;
        };
      };
    };
  };
};
