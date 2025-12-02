import OpenAI from 'openai';
import { env } from '../config/env';
import { orchestrationService } from './orchestration.service';

/**
 * OpenAI Service - Wrapper for backward compatibility
 * Delegates to orchestrationService for actual AI operations
 */
export class OpenAIService {
  /**
   * Generate a response from OpenAI chat completion
   */
  static async chat(
    messages: Array<{ role: string; content: string }>
  ): Promise<string> {
    const result = await orchestrationService.orchestrate(
      messages[messages.length - 1].content,
      {
        conversationHistory: messages.slice(0, -1) as any,
      }
    );

    return result.content;
  }

  /**
   * Stream a response from OpenAI chat completion
   */
  static async chatStream(
    messages: Array<{ role: string; content: string }>,
    onChunk: (chunk: string, isThinking: boolean) => void
  ): Promise<void> {
    const generator = orchestrationService.orchestrateStream(
      messages[messages.length - 1].content,
      {
        conversationHistory: messages.slice(0, -1) as any,
      }
    );

    for await (const event of generator) {
      if (event.type === 'text') {
        onChunk(event.content, false);
      } else if (event.type === 'thinking') {
        onChunk(event.content, true);
      }
    }
  }

  /**
   * Generate a title for a chat session based on the first message
   */
  static async generateTitle(firstMessage: string): Promise<string> {
    try {
      console.log(`🏷️  Generating title for message: "${firstMessage}"`);
      
      // Use OpenAI directly for simple title generation (not orchestration)
      const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
      
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Generate a professional, descriptive title (max 4-5 words) for this conversation.

IMPORTANT:
- Make it DESCRIPTIVE, not a copy of the user's message
- Use professional business terminology
- Be concise and clear
- Only return the title, nothing else

Examples:
- User: "mostrami gli articoli" → Title: "Overview Articoli"
- User: "dammi i clienti attivi" → Title: "Clienti Attivi"
- User: "crea un nuovo ordine" → Title: "Nuovo Ordine"
- User: "analizza le vendite di novembre" → Title: "Analisi Vendite Novembre"`,
          },
          {
            role: 'user',
            content: `User message: "${firstMessage}"\n\nTitle:`,
          },
        ],
        temperature: 0.7,
        max_tokens: 20,
      });

      // Clean up the response
      let title = response.choices[0]?.message?.content?.trim() || '';
      console.log(`🏷️  Raw title from OpenAI: "${title}"`);
      
      // Remove quotes if present
      title = title.replace(/^["']|["']$/g, '');
      // Remove "Title:" prefix if present
      title = title.replace(/^Title:\s*/i, '');
      // Truncate if too long
      if (title.length > 50) {
        title = title.substring(0, 47) + '...';
      }

      console.log(`🏷️  Final cleaned title: "${title}"`);
      return title || 'New Chat';
    } catch (error) {
      console.error('❌ Failed to generate title:', error);
      return 'New Chat';
    }
  }
}
