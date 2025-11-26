import OpenAI from 'openai';
import { env } from '../config/env';

/**
 * Thesys C1 Generative UI Service
 * Uses OpenAI SDK with C1 baseURL for UI generation
 */

interface C1Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GenerateUIOptions {
  prompt: string;
  data?: any;
  conversationHistory?: C1Message[];
  model?: string; // C1 model identifier (e.g., 'c1/anthropic/claude-sonnet-4/v-20250930')
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

interface C1StreamChunk {
  type: 'thinking' | 'content' | 'artifact';
  content: string;
  artifactType?: 'react' | 'chart' | 'document';
}

export class C1Service {
  private client: OpenAI;
  private defaultModel: string = 'c1/anthropic/claude-sonnet-4/v-20250930'; // Latest stable Claude Sonnet 4

  constructor() {
    // Initialize OpenAI client with C1 baseURL
    this.client = new OpenAI({
      apiKey: env.THESYS_API_KEY,
      baseURL: 'https://api.thesys.dev/v1/embed',
    });
  }

  /**
   * Generate UI from prompt and data
   */
  async generateUI(options: GenerateUIOptions): Promise<string> {
    const {
      prompt,
      data,
      conversationHistory = [],
      model = this.defaultModel,
      temperature = 0.7,
      maxTokens = 4096,
      stream = false,
    } = options;

    // Build messages array
    const messages: C1Message[] = [
      {
        role: 'system',
        content: `You are a helpful assistant that creates interactive data visualizations and UIs.
When provided with data, generate appropriate React components using modern UI libraries.
Focus on clarity, interactivity, and data-driven insights.
Use charts, tables, cards, and other components as needed.`,
      },
      ...conversationHistory,
      {
        role: 'user',
        content: this.buildPromptWithData(prompt, data),
      },
    ];

    try {
      if (stream) {
        throw new Error('Streaming not yet implemented in generateUI. Use generateUIStream() instead.');
      }

      const response = await this.client.chat.completions.create({
        model,
        messages: messages as any,
        temperature,
        max_tokens: maxTokens,
      });

      const content = response.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content generated from C1');
      }

      return content;
    } catch (error: any) {
      console.error('C1 UI generation error:', error.message);
      throw new Error(`Failed to generate UI: ${error.message}`);
    }
  }

  /**
   * Generate UI with streaming support
   */
  async *generateUIStream(options: GenerateUIOptions): AsyncGenerator<C1StreamChunk> {
    const {
      prompt,
      data,
      conversationHistory = [],
      model = this.defaultModel,
      temperature = 0.7,
      maxTokens = 4096,
    } = options;

    // Build messages array
    const messages: C1Message[] = [
      {
        role: 'system',
        content: `You are a helpful assistant that creates interactive data visualizations and UIs.
When provided with data, generate appropriate React components using modern UI libraries.
Focus on clarity, interactivity, and data-driven insights.
Use charts, tables, cards, and other components as needed.`,
      },
      ...conversationHistory,
      {
        role: 'user',
        content: this.buildPromptWithData(prompt, data),
      },
    ];

    try {
      const stream = await this.client.chat.completions.create({
        model,
        messages: messages as any,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      });

      let currentSection: 'thinking' | 'content' | 'artifact' | null = null;
      let buffer = '';

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        
        if (!delta) continue;

        buffer += delta;

        // Parse C1 XML-like format: <thinking>, <content>, <artifact>
        const thinkingMatch = buffer.match(/<thinking>(.*?)<\/thinking>/s);
        const contentMatch = buffer.match(/<content>(.*?)<\/content>/s);
        const artifactMatch = buffer.match(/<artifact[^>]*>(.*?)<\/artifact>/s);

        if (thinkingMatch) {
          yield {
            type: 'thinking',
            content: thinkingMatch[1],
          };
          buffer = buffer.replace(thinkingMatch[0], '');
          currentSection = 'thinking';
        }

        if (contentMatch) {
          yield {
            type: 'content',
            content: contentMatch[1],
          };
          buffer = buffer.replace(contentMatch[0], '');
          currentSection = 'content';
        }

        if (artifactMatch) {
          const artifactTypeMatch = buffer.match(/<artifact\s+type="([^"]+)"/);
          const artifactType = artifactTypeMatch?.[1] as 'react' | 'chart' | 'document' | undefined;

          yield {
            type: 'artifact',
            content: artifactMatch[1],
            artifactType,
          };
          buffer = buffer.replace(artifactMatch[0], '');
          currentSection = 'artifact';
        }

        // If no tags found, yield as content
        if (!thinkingMatch && !contentMatch && !artifactMatch && buffer.length > 50) {
          yield {
            type: 'content',
            content: buffer,
          };
          buffer = '';
        }
      }

      // Flush remaining buffer
      if (buffer.trim()) {
        yield {
          type: 'content',
          content: buffer,
        };
      }
    } catch (error: any) {
      console.error('C1 streaming error:', error.message);
      throw new Error(`Failed to stream UI generation: ${error.message}`);
    }
  }

  /**
   * Build prompt with embedded data
   */
  private buildPromptWithData(prompt: string, data?: any): string {
    if (!data) {
      return prompt;
    }

    const dataString = typeof data === 'string' 
      ? data 
      : JSON.stringify(data, null, 2);

    return `${prompt}

Here is the data to visualize:
\`\`\`json
${dataString}
\`\`\`

Please create an interactive, visually appealing UI component to display this data effectively.`;
  }

  /**
   * Create a simple text response (no UI generation)
   * Uses standard OpenAI endpoint
   */
  async generateTextResponse(
    prompt: string,
    conversationHistory: C1Message[] = []
  ): Promise<string> {
    const messages: C1Message[] = [
      {
        role: 'system',
        content: 'You are a helpful assistant.',
      },
      ...conversationHistory,
      {
        role: 'user',
        content: prompt,
      },
    ];

    try {
      // Use standard OpenAI client (not C1)
      const standardClient = new OpenAI({
        apiKey: env.OPENAI_API_KEY,
      });

      const response = await standardClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages as any,
        temperature: 0.7,
        max_tokens: 1024,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error: any) {
      console.error('Text response error:', error.message);
      throw new Error(`Failed to generate text response: ${error.message}`);
    }
  }

  /**
   * Check if request requires UI generation vs simple text
   */
  requiresUI(prompt: string): boolean {
    const uiKeywords = [
      'mostra',
      'visualizza',
      'grafico',
      'tabella',
      'dashboard',
      'chart',
      'show',
      'display',
      'visualize',
      'view',
      'report',
    ];

    const lowerPrompt = prompt.toLowerCase();
    return uiKeywords.some(keyword => lowerPrompt.includes(keyword));
  }
}

// Singleton instance
export const c1Service = new C1Service();
