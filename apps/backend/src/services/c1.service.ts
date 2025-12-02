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
  currentUIContent?: string; // Existing UI for incremental updates
  uiAction?: 'NEW' | 'ADD' | 'MODIFY' | 'REPLACE'; // Action determined by orchestrator
  uiSpec?: any; // UI specification from OpenAI (WHAT to show)
  formSpec?: any; // Form specification from OpenAI (WHAT fields needed)
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
        content: `You are a UI generation assistant that interprets WHAT to show and decides HOW to show it.
When provided with data and a UI specification, generate appropriate React components.
Focus on clarity, interactivity, and data-driven insights.
Use charts, tables, cards, and other components as needed.`,
      },
      ...conversationHistory,
      {
        role: 'user',
        content: this.buildPromptWithData(prompt, data, options.uiSpec, options.formSpec),
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
      currentUIContent,
      uiAction = 'NEW',
      model = this.defaultModel,
      temperature = 0.7,
      maxTokens = 4096,
    } = options;

    // Build action-specific context
    let actionContext = '';
    
    if (uiAction === 'ADD' && currentUIContent) {
      actionContext = `\n\n═══════════════════════════════════════════════════════
📦 ADD MODE - Generate ONLY new components
═══════════════════════════════════════════════════════

Existing UI (first 2000 chars):
\`\`\`jsx
${currentUIContent.substring(0, 2000)}
\`\`\`

⚠️ INSTRUCTIONS:
- Generate ONLY the NEW components requested
- DO NOT repeat existing components
- New components will be appended to existing UI
- Ensure new components are self-contained and styled consistently

═══════════════════════════════════════════════════════
`;
    } else if (uiAction === 'MODIFY' && currentUIContent) {
      actionContext = `\n\n═══════════════════════════════════════════════════════
🔧 MODIFY MODE - Generate ONLY modified components
═══════════════════════════════════════════════════════

Existing UI (first 2000 chars):
\`\`\`jsx
${currentUIContent.substring(0, 2000)}
\`\`\`

⚠️ INSTRUCTIONS:
- Generate ONLY the components that need modification
- Use clear markers: <!-- REPLACE: ComponentName -->
- Modified components will replace their counterparts
- Keep same component structure/props when possible

Example format:
<!-- REPLACE: StatsCard -->
<div className="stats-card">...</div>
<!-- END_REPLACE -->

═══════════════════════════════════════════════════════
`;
    } else if (uiAction === 'REPLACE') {
      actionContext = `\n\n═══════════════════════════════════════════════════════
🔄 REPLACE MODE - Generate complete new UI
═══════════════════════════════════════════════════════

Generating fresh UI to replace existing content.
Create a complete, self-contained interface.

═══════════════════════════════════════════════════════
`;
    }

    // Build messages array
    const messages: C1Message[] = [
      {
        role: 'system',
        content: `You are a helpful assistant that creates interactive data visualizations and UIs.${actionContext}
When provided with data, generate appropriate React components using modern UI libraries.
Focus on clarity, interactivity, and data-driven insights.
Use charts, tables, cards, and other components as needed.

⚠️ CRITICAL STYLING RULE:
DO NOT use "crayon-card-card" class on the outermost <div> wrapper.
The outermost container should be plain or use layout classes only (flex, grid, etc).
Use "crayon-card-card" only for inner components/cards, not the root element.

═══════════════════════════════════════════════════════
📋 INTERACTIVE FORMS & ACTIONS - Complete Guide
═══════════════════════════════════════════════════════

When user asks to CREATE, MODIFY, or SEARCH data (e.g., "crea nuovo ordine", "modifica cliente", "cerca prodotti"):
Generate complete interactive forms with ALL necessary components.

🎯 AVAILABLE COMPONENTS:
- Input fields: text, number, email, date, datetime
- Select dropdowns: single/multi-select
- Checkboxes & Radio buttons
- Search bars with filters
- Buttons: primary, secondary, danger
- Tables with sorting/pagination
- Cards for displaying data
- Modals/Dialogs for confirmations

📝 FORM GENERATION PATTERN:

<content thesys="true">
{
  "type": "form",
  "title": "Create Sales Order",
  "description": "Fill in the details to create a new sales order",
  "fields": [
    {
      "type": "select",
      "name": "customerId",
      "label": "Customer",
      "placeholder": "Select customer...",
      "required": true,
      "options": [/* data from context */]
    },
    {
      "type": "date",
      "name": "orderDate",
      "label": "Order Date",
      "defaultValue": "today",
      "required": true
    },
    {
      "type": "text",
      "name": "notes",
      "label": "Notes",
      "multiline": true,
      "rows": 3
    },
    {
      "type": "table",
      "name": "items",
      "label": "Order Items",
      "columns": [
        {"field": "itemCode", "header": "Item", "editable": true, "type": "select"},
        {"field": "quantity", "header": "Qty", "editable": true, "type": "number"},
        {"field": "unitPrice", "header": "Price", "editable": true, "type": "number"},
        {"field": "total", "header": "Total", "computed": "quantity * unitPrice"}
      ],
      "actions": [
        {"label": "Add Item", "action": "add_row"},
        {"label": "Remove", "action": "delete_row", "rowLevel": true}
      ]
    }
  ],
  "actions": [
    {
      "type": "submit",
      "label": "Create Order",
      "variant": "primary",
      "action": {
        "type": "create_sales_order",
        "confirmMessage": "Create this sales order?",
        "successMessage": "Order created successfully!"
      }
    },
    {
      "type": "button",
      "label": "Cancel",
      "variant": "secondary",
      "action": "close"
    }
  ],
  "validation": {
    "customerId": {"required": true},
    "items": {"minLength": 1, "message": "Add at least one item"}
  }
}
</content>

🔍 SEARCH/FILTER PATTERN:

<content thesys="true">
{
  "type": "search_panel",
  "title": "Search Products",
  "filters": [
    {
      "type": "text",
      "name": "searchTerm",
      "placeholder": "Search by name or code...",
      "icon": "search"
    },
    {
      "type": "select",
      "name": "category",
      "label": "Category",
      "options": [/* categories */],
      "allowEmpty": true
    },
    {
      "type": "range",
      "name": "priceRange",
      "label": "Price Range",
      "min": 0,
      "max": 10000,
      "step": 100
    },
    {
      "type": "date_range",
      "name": "dateRange",
      "label": "Creation Date"
    }
  ],
  "actions": [
    {"label": "Search", "action": "apply_filters", "variant": "primary"},
    {"label": "Clear", "action": "reset_filters", "variant": "secondary"}
  ],
  "results": {
    "type": "table",
    "data": [/* search results */],
    "columns": [...],
    "pagination": true,
    "sorting": true
  }
}
</content>

🎨 COMPLETE FORM EXAMPLE (Sales Order):

<content thesys="true">
{
  "type": "form_panel",
  "title": "New Sales Order",
  "layout": "vertical",
  "sections": [
    {
      "title": "Customer Information",
      "fields": [
        {
          "type": "autocomplete",
          "name": "customerId",
          "label": "Customer",
          "required": true,
          "searchable": true,
          "options": [
            {"value": "CUST001", "label": "ACME Corp", "meta": "Rome, Italy"},
            {"value": "CUST002", "label": "TechStart SRL", "meta": "Milan, Italy"}
          ]
        },
        {
          "type": "text",
          "name": "customerEmail",
          "label": "Email",
          "readonly": true,
          "computed": "from customer data"
        }
      ]
    },
    {
      "title": "Order Details",
      "layout": "horizontal",
      "fields": [
        {
          "type": "date",
          "name": "orderDate",
          "label": "Order Date",
          "defaultValue": "{{today}}",
          "required": true
        },
        {
          "type": "date",
          "name": "deliveryDate",
          "label": "Expected Delivery",
          "minDate": "{{orderDate}}",
          "required": true
        },
        {
          "type": "select",
          "name": "paymentTerm",
          "label": "Payment Terms",
          "options": [
            {"value": "30", "label": "Net 30"},
            {"value": "60", "label": "Net 60"},
            {"value": "immediate", "label": "Immediate"}
          ],
          "defaultValue": "30"
        }
      ]
    },
    {
      "title": "Order Items",
      "type": "editable_table",
      "name": "items",
      "minRows": 1,
      "columns": [
        {
          "field": "itemCode",
          "header": "Product",
          "type": "autocomplete",
          "required": true,
          "width": "300px",
          "options": [/* products */]
        },
        {
          "field": "description",
          "header": "Description",
          "type": "text",
          "readonly": true
        },
        {
          "field": "quantity",
          "header": "Quantity",
          "type": "number",
          "required": true,
          "min": 1,
          "defaultValue": 1
        },
        {
          "field": "unitPrice",
          "header": "Unit Price (€)",
          "type": "number",
          "required": true,
          "decimals": 2
        },
        {
          "field": "discount",
          "header": "Discount (%)",
          "type": "number",
          "min": 0,
          "max": 100,
          "defaultValue": 0
        },
        {
          "field": "total",
          "header": "Total (€)",
          "type": "computed",
          "formula": "(quantity * unitPrice) * (1 - discount/100)",
          "readonly": true,
          "format": "currency"
        }
      ],
      "actions": [
        {"icon": "plus", "label": "Add Row", "action": "add_row"},
        {"icon": "trash", "label": "Delete", "action": "delete_row", "rowLevel": true, "variant": "danger"}
      ],
      "footer": {
        "showTotals": true,
        "totals": [
          {"label": "Subtotal", "field": "total", "sum": true},
          {"label": "VAT (22%)", "computed": "subtotal * 0.22"},
          {"label": "Total", "computed": "subtotal * 1.22", "bold": true}
        ]
      }
    },
    {
      "title": "Additional Information",
      "fields": [
        {
          "type": "textarea",
          "name": "notes",
          "label": "Notes",
          "rows": 3,
          "placeholder": "Add any additional notes..."
        },
        {
          "type": "checkbox",
          "name": "sendConfirmation",
          "label": "Send confirmation email to customer",
          "defaultValue": true
        }
      ]
    }
  ],
  "actions": [
    {
      "type": "submit",
      "label": "Create Order",
      "variant": "primary",
      "icon": "check",
      "onAction": {
        "type": "create_sales_order",
        "params": "{{formData}}",
        "humanFriendlyMessage": "Create sales order with {{items.length}} items for customer {{customerName}}?",
        "llmFriendlyMessage": "User confirmed creation of sales order"
      }
    },
    {
      "type": "button",
      "label": "Save as Draft",
      "variant": "secondary",
      "icon": "save",
      "onAction": {
        "type": "save_draft",
        "params": "{{formData}}"
      }
    },
    {
      "type": "button",
      "label": "Cancel",
      "variant": "ghost",
      "onAction": "close"
    }
  ],
  "validation": {
    "rules": {
      "customerId": {"required": true, "message": "Customer is required"},
      "orderDate": {"required": true},
      "deliveryDate": {"required": true, "after": "orderDate"},
      "items": {"minLength": 1, "message": "Add at least one item"},
      "items.*.itemCode": {"required": true},
      "items.*.quantity": {"required": true, "min": 1},
      "items.*.unitPrice": {"required": true, "min": 0}
    },
    "validateOnChange": true,
    "validateOnSubmit": true
  }
}
</content>

⚡ KEY PRINCIPLES:
1. **Always generate complete forms** - don't leave placeholders
2. **Use onAction for all interactions** - buttons, submits, row actions
3. **Include validation rules** - frontend validation + backend will validate again
4. **Pre-fill when possible** - if user mentions data, include it in defaultValue
5. **Make it intuitive** - good labels, placeholders, help text
6. **Show feedback** - loading states, success/error messages via onAction responses

═══════════════════════════════════════════════════════
`,
      },
      ...conversationHistory,
      {
        role: 'user',
        content: this.buildPromptWithData(prompt, data, options.uiSpec, options.formSpec),
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
   * Build prompt with embedded data, uiSpec, and formSpec
   */
  private buildPromptWithData(prompt: string, data?: any, uiSpec?: any, formSpec?: any): string {
    let enhancedPrompt = prompt;

    // Add UI specification if present
    if (uiSpec) {
      enhancedPrompt += `\n\n🎯 UI Specification (WHAT to show):\n`;
      enhancedPrompt += `- Type: ${uiSpec.type}\n`;
      enhancedPrompt += `- Data: ${uiSpec.dataDescription}\n`;
      if (uiSpec.highlights?.length) {
        enhancedPrompt += `- Highlights: ${uiSpec.highlights.join(', ')}\n`;
      }
      if (uiSpec.chartType) {
        enhancedPrompt += `- Chart Type: ${uiSpec.chartType}\n`;
      }
      if (uiSpec.groupBy) {
        enhancedPrompt += `- Group By: ${uiSpec.groupBy}\n`;
      }
      if (uiSpec.sortBy) {
        enhancedPrompt += `- Sort By: ${uiSpec.sortBy.field} (${uiSpec.sortBy.direction})\n`;
      }
    }

    // Add Form specification if present
    if (formSpec) {
      enhancedPrompt += `\n\n📝 Form Specification (WHAT fields needed):\n`;
      enhancedPrompt += `- Action: ${formSpec.actionType}\n`;
      enhancedPrompt += `- Title: ${formSpec.title}\n`;
      enhancedPrompt += `- Description: ${formSpec.description}\n`;
      if (formSpec.prefillData) {
        enhancedPrompt += `- Prefill Data: ${JSON.stringify(formSpec.prefillData)}\n`;
      }
      if (formSpec.hiddenFields?.length) {
        enhancedPrompt += `- Hidden Fields: ${formSpec.hiddenFields.join(', ')}\n`;
      }
    }

    // Add data if present
    if (data) {
      const dataString = typeof data === 'string' 
        ? data 
        : JSON.stringify(data, null, 2);

      enhancedPrompt += `\n\nData to visualize:\n\`\`\`json\n${dataString}\n\`\`\`\n`;
    }

    return enhancedPrompt;
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

  // requiresUI() removed - OpenAI now decides responseFormat via structured output
}

// Singleton instance
export const c1Service = new C1Service();
