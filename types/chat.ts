export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id?: string;
  role: MessageRole;
  content: string;
  timestamp?: Date;
}

export type ChatHistory = ChatMessage[];

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatRequestBody {
  messages: Array<{
    role: string;
    content: string;
  }>;
  conversation_id?: string;
}

export interface ChatResponseBody {
  message: {
    role: string;
    content: string;
  };
  usage?: {
    current: number;
    limit: number;
    limitReached: boolean;
  };
  conversation_id?: string;
}
