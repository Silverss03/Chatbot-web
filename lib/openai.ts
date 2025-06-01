import OpenAI from 'openai';

// Create a singleton instance of the OpenAI client
let openai: OpenAI;

export function getOpenAIInstance(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not defined in environment variables');
    }
    
    openai = new OpenAI({
      apiKey,
    });
  }
  
  return openai;
}
