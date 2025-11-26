import OpenAI from 'openai';
import { env } from '../config/env';
import { fluentisService } from './fluentis.service';
import { c1Service } from './c1.service';

/**
 * OpenAI Orchestration Service
 * Handles function calling to orchestrate Fluentis queries and C1 UI generation
 */

interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

interface OrchestrationOptions {
  conversationHistory?: Message[];
  sessionId?: string;
}

interface OrchestrationResult {
  type: 'text' | 'ui';
  content: string;
  toolCalls?: any[];
  data?: any;
}

// Define available tools for OpenAI function calling
const FLUENTIS_TOOLS: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'export_sales_orders',
      description: 'Export sales orders from Fluentis ERP. Use this when user asks about sales, orders, or revenue.',
      parameters: {
        type: 'object',
        properties: {
          dateFrom: {
            type: 'string',
            description: 'Start date in format YYYY-MM-DD',
          },
          dateTo: {
            type: 'string',
            description: 'End date in format YYYY-MM-DD',
          },
          customerId: {
            type: 'string',
            description: 'Optional customer ID to filter by',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_stock_levels',
      description: 'Get current stock/inventory levels from Fluentis warehouse. Use when user asks about inventory, stock, or availability.',
      parameters: {
        type: 'object',
        properties: {
          itemCode: {
            type: 'string',
            description: 'Optional item code to filter by specific product',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'export_items',
      description: 'Export product/item catalog from Fluentis. Use when user asks about products, items, or catalog.',
      parameters: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            description: 'Optional DevExpress filter criteria',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'export_customers',
      description: 'Export customer list from Fluentis. Use when user asks about customers or clients.',
      parameters: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            description: 'Optional DevExpress filter criteria',
          },
        },
        required: [],
      },
    },
  },
];

export class OpenAIOrchestrationService {
  private client: OpenAI;
  private model = 'gpt-4o-mini'; // Using gpt-4o-mini for function calling

  constructor() {
    this.client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  /**
   * Main orchestration method
   * 1. Analyze user intent with function calling
   * 2. Execute Fluentis tools if needed
   * 3. Route to C1 for UI generation or return text response
   */
  async orchestrate(
    userPrompt: string,
    options: OrchestrationOptions = {}
  ): Promise<OrchestrationResult> {
    const { conversationHistory = [] } = options;

    // Build messages with system prompt
    const messages: Message[] = [
      {
        role: 'system',
        content: `You are an intelligent assistant that helps users query their Fluentis ERP system and visualize data.

When users ask about business data (sales, inventory, customers, products), use the available tools to fetch the data.
After fetching data, always suggest creating a visualization or UI to display it effectively.

Available data sources:
- Sales orders (export_sales_orders)
- Stock/inventory levels (get_stock_levels)
- Product catalog (export_items)
- Customer list (export_customers)

If user asks for visualizations or UI, you'll receive the data and can describe what to show.`,
      },
      ...conversationHistory,
      {
        role: 'user',
        content: userPrompt,
      },
    ];

    try {
      // Step 1: Call OpenAI with function calling
      console.log('🤖 OpenAI orchestration started...');
      console.log('📝 Request:', {
        model: this.model,
        toolsCount: FLUENTIS_TOOLS.length,
        userPrompt: userPrompt.substring(0, 100),
      });
      
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: messages as any,
        tools: FLUENTIS_TOOLS,
        tool_choice: 'auto',
      });

      const assistantMessage = response.choices[0].message;
      const toolCalls = assistantMessage.tool_calls;

      console.log('📨 Response:', {
        hasToolCalls: !!toolCalls,
        toolCallsCount: toolCalls?.length || 0,
        content: assistantMessage.content?.substring(0, 100),
      });

      // Step 2: Execute tool calls if present
      if (toolCalls && toolCalls.length > 0) {
        console.log(`🔧 Executing ${toolCalls.length} tool call(s)...`);
        
        const toolMessages: Message[] = [];
        let fetchedData: any = null;

        for (const toolCall of toolCalls) {
          if (toolCall.type !== 'function') continue;
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);

          console.log(`   → ${functionName}`, functionArgs);

          let result: any;

          try {
            // Execute the appropriate Fluentis function
            result = await this.executeFluentisFunction(functionName, functionArgs);
            fetchedData = result; // Store for UI generation
          } catch (error: any) {
            result = { error: error.message };
            console.error(`   ✗ Tool execution failed:`, error.message);
          }

          // Add tool result to messages
          toolMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: functionName,
            content: JSON.stringify(result),
          });
        }

        // Step 3: Determine if UI generation is needed
        const requiresUI = c1Service.requiresUI(userPrompt);

        if (requiresUI && fetchedData) {
          console.log('🎨 Generating UI with C1...');
          
          // Use C1 to generate UI
          const uiContent = await c1Service.generateUI({
            prompt: userPrompt,
            data: fetchedData,
            conversationHistory: conversationHistory as any,
          });

          return {
            type: 'ui',
            content: uiContent,
            toolCalls: toolCalls
              .filter(tc => tc.type === 'function')
              .map(tc => ({
                name: tc.function.name,
                arguments: JSON.parse(tc.function.arguments),
              })),
            data: fetchedData,
          };
        } else {
          // Continue conversation with OpenAI for text response
          console.log('💬 Generating text response...');
          
          const followUpResponse = await this.client.chat.completions.create({
            model: this.model,
            messages: [
              ...messages,
              assistantMessage as any,
              ...toolMessages as any,
            ],
          });

          return {
            type: 'text',
            content: followUpResponse.choices[0].message.content || '',
            toolCalls: toolCalls
              .filter(tc => tc.type === 'function')
              .map(tc => ({
                name: tc.function.name,
                arguments: JSON.parse(tc.function.arguments),
              })),
            data: fetchedData,
          };
        }
      } else {
        // No tool calls - simple text response
        console.log('💬 Simple text response (no tools needed)');
        
        return {
          type: 'text',
          content: assistantMessage.content || '',
          toolCalls: [],
        };
      }
    } catch (error: any) {
      console.error('❌ Orchestration error:', error.message);
      throw new Error(`Orchestration failed: ${error.message}`);
    }
  }

  /**
   * Execute Fluentis function based on tool call
   */
  private async executeFluentisFunction(
    functionName: string,
    args: Record<string, any>
  ): Promise<any> {
    switch (functionName) {
      case 'export_sales_orders':
        return await fluentisService.exportSales({
          dateFrom: args.dateFrom,
          dateTo: args.dateTo,
          customerId: args.customerId,
        });

      case 'get_stock_levels':
        return await fluentisService.getStockLevels(args.itemCode);

      case 'export_items':
        return await fluentisService.exportItems(args.filter);

      case 'export_customers':
        return await fluentisService.exportCustomers(args.filter);

      default:
        throw new Error(`Unknown function: ${functionName}`);
    }
  }

  /**
   * Stream orchestration with progressive updates
   */
  async *orchestrateStream(
    userPrompt: string,
    options: OrchestrationOptions = {}
  ): AsyncGenerator<{
    type: 'thinking' | 'tool_call' | 'data' | 'ui_chunk' | 'text' | 'summary_message';
    content: any;
  }> {
    const { conversationHistory = [] } = options;

    // Build messages
    const messages: Message[] = [
      {
        role: 'system',
        content: `You are an intelligent assistant that helps users query their Fluentis ERP system and visualize data.

When users ask about business data (sales, inventory, customers, products), use the available tools to fetch the data.
After fetching data, always suggest creating a visualization or UI to display it effectively.`,
      },
      ...conversationHistory,
      {
        role: 'user',
        content: userPrompt,
      },
    ];

    try {
      yield { type: 'thinking', content: 'Analyzing request...' };

      // Call OpenAI with function calling
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: messages as any,
        tools: FLUENTIS_TOOLS,
        tool_choice: 'auto',
      });

      const assistantMessage = response.choices[0].message;
      const toolCalls = assistantMessage.tool_calls;

      if (toolCalls && toolCalls.length > 0) {
        // Execute tools
        const toolMessages: Message[] = [];
        let fetchedData: any = null;

        for (const toolCall of toolCalls) {
          if (toolCall.type !== 'function') continue;
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);

          yield {
            type: 'tool_call',
            content: { name: functionName, arguments: functionArgs },
          };

          const result = await this.executeFluentisFunction(functionName, functionArgs);
          fetchedData = result;

          yield { type: 'data', content: result };

          toolMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: functionName,
            content: JSON.stringify(result),
          });
        }

        // Check if UI generation needed
        const requiresUI = c1Service.requiresUI(userPrompt);

        if (requiresUI && fetchedData) {
          yield { type: 'thinking', content: 'Generating interactive UI...' };

          // Stream UI generation FIRST and accumulate full UI content
          let fullUIContent = '';
          for await (const chunk of c1Service.generateUIStream({
            prompt: userPrompt,
            data: fetchedData,
            conversationHistory: conversationHistory as any,
          })) {
            // Extract only the content string from C1 chunk
            if (chunk.type === 'artifact' || chunk.type === 'content') {
              fullUIContent += chunk.content;
              yield { type: 'ui_chunk', content: chunk.content };
            }
          }

          // Generate summary message AFTER UI is created, passing the full UI to OpenAI
          const summaryResponse = await this.client.chat.completions.create({
            model: this.model,
            messages: [
              {
                role: 'system',
                content: `Sei un assistente AI che lavora come un collega. Hai appena creato una UI interattiva per l'utente.

Analizza la UI generata e scrivi un messaggio conciso (2-3 frasi) che:
1. Riassume i dati chiave o insight principali trovati
2. Menziona cosa l'utente può fare con la UI
3. Usa un tono amichevole e professionale

IMPORTANTE:
- NON copiare testi lunghi dalla UI o sezioni di analisi dettagliate
- Estrai solo i punti salienti più rilevanti (numeri chiave, top performer, trend)
- Sii breve ma informativo
- Usa emoji quando appropriato 📊 📦 🛍️

Esempi:
- "Ho analizzato le vendite: Global Solutions Ltd è il tuo top cliente con €567k (58% del totale). Nella dashboard puoi vedere i trend e confrontare tutti i clienti 📊"
- "Lo stock del Magazzino A è al 85% di capacità con 1.234 articoli. Puoi filtrare per categoria e vedere i dettagli 📦"
- "Il catalogo ha 156 prodotti attivi in 12 categorie. Ho organizzato tutto con prezzi e disponibilità 🛍️"

Usa un tono amichevole e professionale, come se stessi lavorando fianco a fianco con l'utente.`
              },
              {
                role: 'user',
                content: `L'utente ha chiesto: "${userPrompt}"\n\nUI generata (estratto primi 2000 caratteri):\n${fullUIContent.substring(0, 2000)}...\n\nScrivi un messaggio breve (2-3 frasi) che riassuma gli insight chiave trovati nella UI, senza copiare testi lunghi.`
              }
            ],
            temperature: 0.7,
            max_tokens: 150,
          });

          const summaryMessage = summaryResponse.choices[0].message.content || 'Dashboard creata! Guarda il workspace per i dettagli.';
          yield { type: 'summary_message', content: summaryMessage };
        } else {
          // Text response
          const followUpResponse = await this.client.chat.completions.create({
            model: this.model,
            messages: [
              ...messages,
              assistantMessage as any,
              ...toolMessages as any,
            ],
          });

          yield {
            type: 'text',
            content: followUpResponse.choices[0].message.content || '',
          };
        }
      } else {
        // Simple text response
        yield { type: 'text', content: assistantMessage.content || '' };
      }
    } catch (error: any) {
      console.error('Stream orchestration error:', error);
      throw error;
    }
  }
}

// Singleton instance
export const orchestrationService = new OpenAIOrchestrationService();
