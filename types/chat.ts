export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
}

export type ChatHistory = ChatMessage[];

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatRequestBody {
  messages: Message[];
}

export interface ChatResponseBody {
  message: Message;
  usage?: {
    current: number;
    limit: number;
    limitReached: boolean;
  };
}
