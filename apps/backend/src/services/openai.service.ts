import OpenAI from 'openai';
import { env } from '../config/env';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export class OpenAIService {
  /**
   * Send a message and get AI response with streaming
   */
  static async chatStream(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    onChunk: (chunk: string, isThinking?: boolean) => void
  ) {
    try {
      const stream = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant. When you need time to think or process, you can send thinking messages by prefixing with [THINKING]: followed by what you\'re doing (e.g., [THINKING]: Analyzing the data...). Regular responses will be streamed normally.',
          },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 1000,
        stream: true,
      });

      let fullResponse = '';
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          
          // Check if it's a thinking message
          if (fullResponse.includes('[THINKING]:')) {
            const thinkingMatch = fullResponse.match(/\[THINKING\]:\s*([^\n]+)/);
            if (thinkingMatch) {
              onChunk(thinkingMatch[1], true);
              fullResponse = fullResponse.replace(/\[THINKING\]:[^\n]+\n?/, '');
            }
          } else {
            onChunk(content, false);
          }
        }
      }

      return fullResponse.replace(/\[THINKING\]:[^\n]+\n?/g, '').trim();
    } catch (error: any) {
      console.error('OpenAI chat error:', error);
      
      // Check for specific OpenAI errors
      if (error.status === 429) {
        throw new Error('RATE_LIMIT');
      } else if (error.status === 401) {
        throw new Error('INVALID_API_KEY');
      } else if (error.status === 500) {
        throw new Error('OPENAI_SERVER_ERROR');
      }
      
      throw new Error('Failed to get AI response');
    }
  }

  /**
   * Send a message and get AI response (non-streaming, for backwards compatibility)
   */
  static async chat(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      });

      return response.choices[0]?.message?.content || 'No response generated';
    } catch (error: any) {
      console.error('OpenAI chat error:', error);
      
      // Check for specific OpenAI errors
      if (error.status === 429) {
        throw new Error('RATE_LIMIT');
      } else if (error.status === 401) {
        throw new Error('INVALID_API_KEY');
      } else if (error.status === 500) {
        throw new Error('OPENAI_SERVER_ERROR');
      }
      
      throw new Error('Failed to get AI response');
    }
  }

  /**
   * Generate a title for the chat session based on the first message
   */
  static async generateTitle(firstMessage: string): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Generate a short, concise title (max 5 words) for a chat conversation based on the user\'s first message. Reply with only the title, no quotes or punctuation.',
          },
          {
            role: 'user',
            content: firstMessage,
          },
        ],
        temperature: 0.5,
        max_tokens: 20,
      });

      const title = response.choices[0]?.message?.content?.trim() || 'New Chat';
      return title.replace(/^["']|["']$/g, ''); // Remove quotes if any
    } catch (error) {
      console.error('OpenAI title generation error:', error);
      return 'New Chat';
    }
  }
}
