/**
 * OpenAI Client Singleton
 * Ensures environment variables are loaded before OpenAI initialization
 */
import OpenAI from 'openai';

let openaiInstance: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY environment variable is missing. Please check your .env file.'
      );
    }

    openaiInstance = new OpenAI({ apiKey });
  }

  return openaiInstance;
}
