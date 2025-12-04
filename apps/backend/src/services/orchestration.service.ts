import OpenAI from 'openai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { env } from '../config/env';
import { fluentisService } from './fluentis.service';
import { c1Service } from './c1.service';
import type { RequestContext } from '../types/context.types';
import { getApiCatalogDescription, getApiEndpoint, type ApiEndpoint } from '../config/api-catalog';
import {
  type OrchestrationOutput,
  type ApiCall,
  type ResponseFormat,
  ORCHESTRATION_OUTPUT_SCHEMA,
} from '../types/orchestration.types';
import {
  CreateSalesOrderSchema,
  CreateCustomerSchema,
  UpdateCustomerSchema,
  CreateItemSchema,
  UpdateStockSchema,
} from '../validators/action.validators';

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
  context?: any; // RequestContext from middleware
  currentUIContent?: string; // Existing UI for incremental updates
}

interface OrchestrationResult {
  type: 'text' | 'ui';
  content: string;
  layoutIntent?: 'full' | 'extended' | 'preview' | 'hidden';
  toolCalls?: any[];
  data?: any;
  thinking?: string;
}

// Legacy FLUENTIS_TOOLS removed - OpenAI now uses structured output with API catalog

export class OpenAIOrchestrationService {
  private client: OpenAI;
  private model = 'gpt-4o-mini'; // Using gpt-4o-mini for structured output

  constructor() {
    this.client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  /**
   * Parse structured response from OpenAI
   */
  private parseStructuredResponse(content: string): {
    layoutIntent: 'full' | 'extended' | 'preview' | 'hidden';
    response: string;
    thinking?: string;
    suggestUI?: boolean;
  } {
    try {
      const parsed = JSON.parse(content);
      return {
        layoutIntent: parsed.layoutIntent || 'extended',
        response: parsed.response || content,
        thinking: parsed.thinking,
        suggestUI: parsed.suggestUI,
      };
    } catch (error) {
      // Fallback: try to extract layout intent with regex if JSON parsing fails
      const layoutRegex = /\[LAYOUT:(full|extended|preview|hidden)\]/i;
      const match = content.match(layoutRegex);
      
      return {
        layoutIntent: match ? (match[1].toLowerCase() as 'full' | 'extended' | 'preview' | 'hidden') : 'extended',
        response: content.replace(layoutRegex, '').trim(),
      };
    }
  }

  /**
   * Build context-aware system prompt
   */
  private buildSystemPrompt(context?: RequestContext, hasExistingUI?: boolean): string {
    const uiModificationGuidelines = hasExistingUI ? `

## UI Modification Guidelines (IMPORTANT - User has existing UI displayed)
The user currently has an interactive UI/dashboard displayed. When they ask to:
- **"Add X"** or **"Show also Y"**: Fetch any needed data and generate UI that INCLUDES the new elements
- **"Modify/Change X"**: Fetch updated data if needed and regenerate UI with modifications
- **"Remove X"**: Generate UI without the unwanted elements
- **"Add chart/graph for Z"**: Fetch the necessary data for Z (don't ask user to provide it), then generate enhanced UI

CRITICAL: When user asks to add charts/analysis:
1. Identify what data is needed (e.g., prices for value calculation)
2. Call the appropriate read tools to get that data (e.g., get_items for prices)
3. Perform calculations yourself (e.g., quantity * price = value)
4. Generate UI with the complete analysis

DO NOT ask the user to provide data that you can fetch yourself!

### UI Merge Markers (For C1 UI Generator)
When generating UI modifications, C1 should use these markers for precise merging:

**REPLACE Marker** (for modifying specific sections):
\`\`\`jsx
<!-- REPLACE: section-id -->
<Section id="section-id" title="Updated Title">
  {/* New content replaces old section */}
</Section>
<!-- END_REPLACE -->
\`\`\`

**INSERT_AFTER Marker** (for adding content after a section):
\`\`\`jsx
<!-- INSERT_AFTER: existing-section-id -->
<Section id="new-section-id" title="New Section">
  {/* This will be inserted after existing-section-id */}
</Section>
<!-- END_INSERT -->
\`\`\`

**Section IDs** (for automatic detection):
Always use id attributes on Section components:
\`\`\`jsx
<Section id="sales-chart" title="Sales Overview">
  {/* If this ID exists, it will auto-replace when regenerated */}
</Section>
\`\`\`
` : '';

    const basePrompt = `You are Artemis, an intelligent Context-Aware Operating System that acts as the BRAIN for planning and orchestration.

## Your Role (CRITICAL)
You are the ORCHESTRATOR, not the executor:
1. **Analyze** user intent and context
2. **Decide** which APIs to call (from catalog below)
3. **Plan** the response format (text/ui/form)
4. **Specify** WHAT to show/do (not HOW to implement)

Backend will EXECUTE the API calls and generate the actual UI/forms based on your decisions.

${getApiCatalogDescription()}

## Response Format (Structured Output)
You MUST respond with structured JSON:
- responseFormat: 'text' | 'ui' | 'form'
  * text: Simple answer without data visualization
  * ui: Data visualization needed (charts/tables/cards)
  * form: Write operation needs user input
- layoutIntent: 'full' | 'extended' | 'preview' | 'hidden'
  * full: Fullscreen chat for complex conversations
  * extended: Large overlay for explanations with UI
  * preview: Compact for quick answers
  * hidden: UI only, hide chat
- textResponse: Your text response to user
- apiCalls: Array of APIs to call (optional)
  * [{apiId, reason, parameters}]
- uiSpec: UI specification if responseFormat='ui' (WHAT to show)
  * {type, dataDescription, highlights, chartType, groupBy, sortBy}
- formSpec: Form specification if responseFormat='form'
  * {actionType, title, description, prefillData}
- thinking: (optional) Your reasoning for transparency

## Write Operations (CRITICAL)
When user wants to CREATE, ADD, UPDATE, or MODIFY data:
1. **ALWAYS** set responseFormat='form' (not 'ui' or 'text')
2. Specify formSpec with actionType (from: create_sales_order, create_customer, update_customer, create_item, update_stock)
3. Include prefillData if you can infer values from context
4. Backend will generate form → user fills → validates → executes

Examples that require 'form':
- "Create new order" → responseFormat='form', actionType='create_sales_order'
- "Add new customer" → responseFormat='form', actionType='create_customer'
- "New article/item" → responseFormat='form', actionType='create_item'
- "Update stock" → responseFormat='form', actionType='update_stock'
- "Modify customer info" → responseFormat='form', actionType='update_customer'
- User clicks "Nuovo Articolo" button → responseFormat='form', actionType='create_item'

DO NOT use responseFormat='ui' or 'text' for write operations!
${uiModificationGuidelines}`;

    if (!context) {
      return basePrompt;
    }

    // Build context sections
    const contextSections: string[] = [];

    // User Context
    if (context.user) {
      contextSections.push(`\n\n## Current User Context\n- Name: ${context.user.name}\n- Email: ${context.user.email}`);
      
      if (context.user.role) {
        contextSections.push(`- Role: ${context.user.role.name}\n- Department: ${context.user.role.departmentName}`);
        if (context.user.role.permissions && context.user.role.permissions.length > 0) {
          contextSections.push(`- Permissions: ${context.user.role.permissions.slice(0, 5).join(', ')}${context.user.role.permissions.length > 5 ? '...' : ''}`);
        }
      }
      
      if (context.user.settings) {
        contextSections.push(`- Language: ${context.user.settings.language}\n- Timezone: ${context.user.settings.timezone}`);
      }
      
      // User AI Preferences (Long-term Memory)
      if (context.user.preferences) {
        const prefs = context.user.preferences;
        contextSections.push(`\n## User Preferences (Remember these)`);
        if (prefs.defaultChartType) contextSections.push(`- Prefers ${prefs.defaultChartType} charts`);
        if (prefs.defaultDateRange) contextSections.push(`- Default date range: ${prefs.defaultDateRange}`);
        if (prefs.defaultTablePageSize) contextSections.push(`- Table page size: ${prefs.defaultTablePageSize}`);
        if (prefs.preferredWarehouse) contextSections.push(`- Preferred warehouse: ${prefs.preferredWarehouse}`);
        if (prefs.favoriteCustomers && Array.isArray(prefs.favoriteCustomers) && prefs.favoriteCustomers.length > 0) {
          contextSections.push(`- Favorite customers: ${prefs.favoriteCustomers.slice(0, 5).join(', ')}`);
        }
        if (prefs.favoriteItems && Array.isArray(prefs.favoriteItems) && prefs.favoriteItems.length > 0) {
          contextSections.push(`- Favorite items: ${prefs.favoriteItems.slice(0, 5).join(', ')}`);
        }
        if (prefs.frequentQueries && Array.isArray(prefs.frequentQueries) && prefs.frequentQueries.length > 0) {
          contextSections.push(`- Frequently asks about: ${prefs.frequentQueries.map((q: any) => q.query).slice(0, 3).join(', ')}`);
        }
      }
    }

    // Company Context
    if (context.company) {
      contextSections.push(`\n\n## Company Context\n- Company: ${context.company.name}`);
      if (context.company.sector) {
        contextSections.push(`- Sector: ${context.company.sector}`);
      }
      if (context.company.fluentisCompanyCode || context.company.fluentisDepartmentCode) {
        contextSections.push(`- Fluentis: Company=${context.company.fluentisCompanyCode || 'N/A'}, Department=${context.company.fluentisDepartmentCode || 'N/A'}`);
      }
    }

    // UI Context
    if (context.ui) {
      contextSections.push(`\n\n## Current UI Context`);
      if (context.ui.currentRoute) {
        contextSections.push(`- Current Route: ${context.ui.currentRoute}`);
      }
      if (context.ui.entityId) {
        contextSections.push(`- Viewing Entity: ${context.ui.entityId} (${context.ui.entityType || 'unknown'})`);
      }
      if (context.ui.filters && Object.keys(context.ui.filters).length > 0) {
        contextSections.push(`- Active Filters: ${JSON.stringify(context.ui.filters)}`);
      }
      if (context.ui.layoutMode) {
        contextSections.push(`- Layout Mode: ${context.ui.layoutMode}`);
      }
    }

    // External Context (Time)
    if (context.external) {
      contextSections.push(`\n\n## Time Context\n- Current Date: ${context.external.date.formatted}\n- Current Time: ${context.external.time.formatted}`);
      if (context.external.date.dayOfWeek) {
        contextSections.push(`- Day: ${context.external.date.dayOfWeek}`);
      }
      if (context.external.timezone) {
        contextSections.push(`- Timezone: ${context.external.timezone.name}`);
      }
    }

    // Session Context
    if (context.session) {
      contextSections.push(`\n\n## Session Context\n- Session ID: ${context.session.id}`);
      if (context.session.title) {
        contextSections.push(`- Title: ${context.session.title}`);
      }
      if (context.session.messageCount) {
        contextSections.push(`- Messages: ${context.session.messageCount}`);
      }
    }

    return basePrompt + contextSections.join('');
  }

  /**
   * Main orchestration method with structured output
   * 1. OpenAI decides WHAT to do (structured output)
   * 2. Backend executes API calls
   * 3. Route to C1 for UI generation or return text
   */
  async orchestrate(
    userPrompt: string,
    options: OrchestrationOptions = {}
  ): Promise<OrchestrationResult> {
    const { conversationHistory = [], context, currentUIContent } = options;

    // Build messages with context-aware system prompt
    const messages: Message[] = [
      {
        role: 'system',
        content: this.buildSystemPrompt(context as RequestContext, !!currentUIContent),
      },
      ...conversationHistory,
      {
        role: 'user',
        content: userPrompt,
      },
    ];

    try {
      // Step 1: Call OpenAI with structured output
      console.log('🤖 OpenAI orchestration (structured)...');
      console.log('📝 Request:', {
        model: this.model,
        userPrompt: userPrompt.substring(0, 100),
      });
      
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: messages as any,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'orchestration_output',
            strict: true,
            schema: ORCHESTRATION_OUTPUT_SCHEMA,
          },
        },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const orchestrationOutput: OrchestrationOutput = JSON.parse(content);

      console.log('📨 OpenAI Decision:', {
        responseFormat: orchestrationOutput.responseFormat,
        layoutIntent: orchestrationOutput.layoutIntent,
        apiCalls: orchestrationOutput.apiCalls?.length || 0,
        hasUiSpec: !!orchestrationOutput.uiSpec,
        hasFormSpec: !!orchestrationOutput.formSpec,
        thinking: orchestrationOutput.thinking?.substring(0, 100),
      });

      // Step 2: Execute API calls if specified
      let fetchedData: any = null;
      if (orchestrationOutput.apiCalls && orchestrationOutput.apiCalls.length > 0) {
        console.log(`🔧 Executing ${orchestrationOutput.apiCalls.length} API call(s)...`);
        fetchedData = await this.executeApiCalls(orchestrationOutput.apiCalls, context as RequestContext);
      }

      // Step 3: Route based on response format
      switch (orchestrationOutput.responseFormat) {
        case 'ui':
          // Generate UI with C1 based on uiSpec
          console.log('🎨 Generating UI with C1...');
          const uiContent = await c1Service.generateUI({
            prompt: userPrompt,
            data: fetchedData || {},
            conversationHistory: conversationHistory as any,
            uiSpec: orchestrationOutput.uiSpec,
          });

          return {
            type: 'ui',
            content: uiContent,
            layoutIntent: orchestrationOutput.layoutIntent,
            thinking: orchestrationOutput.thinking,
            data: fetchedData,
          };

        case 'form':
          // Generate form with C1 based on formSpec
          console.log('📝 Generating form with C1...');
          const formContent = await c1Service.generateUI({
            prompt: userPrompt,
            data: orchestrationOutput.formSpec,
            conversationHistory: conversationHistory as any,
            formSpec: orchestrationOutput.formSpec,
          });

          return {
            type: 'ui', // Forms are rendered as UI
            content: formContent,
            layoutIntent: orchestrationOutput.layoutIntent,
            thinking: orchestrationOutput.thinking,
          };

        case 'text':
        default:
          // Simple text response
          console.log('💬 Text response');
          return {
            type: 'text',
            content: orchestrationOutput.textResponse,
            layoutIntent: orchestrationOutput.layoutIntent,
            thinking: orchestrationOutput.thinking,
            data: fetchedData,
          };
      }
    } catch (error: any) {
      console.error('❌ Orchestration error:', error.message);
      throw new Error(`Orchestration failed: ${error.message}`);
    }
  }

  /**
   * Classify error type for retry logic
   */
  private classifyError(error: any, apiId: string): 'retriable' | 'fatal' {
    const errorMsg = error.message?.toLowerCase() || '';
    
    // Network/timeout errors - retriable
    if (
      errorMsg.includes('timeout') ||
      errorMsg.includes('econnrefused') ||
      errorMsg.includes('econnreset') ||
      errorMsg.includes('network') ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ECONNREFUSED'
    ) {
      return 'retriable';
    }
    
    // Rate limiting - retriable
    if (errorMsg.includes('rate limit') || errorMsg.includes('too many requests')) {
      return 'retriable';
    }
    
    // Validation errors - fatal (need user clarification)
    if (
      errorMsg.includes('validation') ||
      errorMsg.includes('invalid') ||
      errorMsg.includes('required') ||
      errorMsg.includes('missing parameter')
    ) {
      return 'fatal';
    }
    
    // Authentication errors - fatal
    if (
      errorMsg.includes('unauthorized') ||
      errorMsg.includes('forbidden') ||
      errorMsg.includes('authentication')
    ) {
      return 'fatal';
    }
    
    // Default: retriable for safety (server errors might be transient)
    return 'retriable';
  }

  /**
   * Execute single API call with retry logic and exponential backoff
   */
  private async executeApiCallWithRetry(
    apiCall: ApiCall,
    context?: RequestContext,
    maxRetries: number = 3
  ): Promise<any> {
    const endpoint = getApiEndpoint(apiCall.apiId);
    if (!endpoint) {
      throw new Error(`Unknown API: ${apiCall.apiId}`);
    }

    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[API] ${apiCall.apiId} - Attempt ${attempt}/${maxRetries}`);
        
        let result: any;
        const p = apiCall.parameters as any;

        // Execute based on endpoint (same switch as before)
        switch (apiCall.apiId) {
          case 'export_sales_orders':
            result = await fluentisService.exportSalesOrders({ ...p, context });
            break;
          case 'export_items':
            result = await fluentisService.exportItems({ ...p, context });
            break;
          case 'export_customers':
            result = await fluentisService.exportContacts({ ...p, contactType: 'Customer', context });
            break;
          case 'export_stock_levels':
            result = await fluentisService.getItemsStock({ ...p, context });
            break;
          case 'check_item_availability':
            result = await fluentisService.getItemsAvailability(
              [{ itemCode: p.itemCode, requestedQuantity: p.requestedQuantity, warehouseCode: p.warehouseCode }],
              { context }
            );
            break;
          case 'get_customer_orders':
            result = await fluentisService.exportSalesOrders({ ...p, context });
            break;
          case 'create_sales_order':
            result = await fluentisService.createSalesOrder({ ...p, context });
            break;
          case 'create_customer':
            result = await fluentisService.createCustomer({ ...p, context });
            break;
          case 'update_customer':
            result = await fluentisService.updateCustomer({ ...p, context });
            break;
          case 'create_item':
            result = await fluentisService.createItem({ ...p, context });
            break;
          case 'update_stock':
            result = await fluentisService.updateStock({ ...p, context });
            break;
          default:
            throw new Error(`API ${apiCall.apiId} not yet implemented`);
        }

        console.log(`✅ [API Success] ${apiCall.apiId}`);
        return result;
        
      } catch (error: any) {
        lastError = error;
        const errorType = this.classifyError(error, apiCall.apiId);
        
        console.error(`❌ [API Error] ${apiCall.apiId} (${errorType}):`, error.message);
        
        // Don't retry fatal errors or last attempt
        if (errorType === 'fatal' || attempt === maxRetries) {
          throw error;
        }
        
        // Exponential backoff: 1s, 2s, 4s
        const backoffMs = Math.pow(2, attempt - 1) * 1000;
        console.log(`⏳ Retry in ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
    
    throw lastError;
  }

  /**
   * Execute API calls from OpenAI's decision with retry logic
   * Replaces executeFluentisFunction - now uses API catalog
   */
  private async executeApiCalls(
    apiCalls: ApiCall[],
    context?: RequestContext
  ): Promise<{ [key: string]: any }> {
    const results: { [key: string]: any } = {};
    const errors: Array<{ apiId: string; reason: string; error: string; errorType: 'retriable' | 'fatal' }> = [];

    for (const apiCall of apiCalls) {
      try {
        const result = await this.executeApiCallWithRetry(apiCall, context);
        results[apiCall.apiId] = result;
      } catch (error: any) {
        const errorType = this.classifyError(error, apiCall.apiId);
        
        // Store structured error info
        errors.push({
          apiId: apiCall.apiId,
          reason: apiCall.reason,
          error: error.message,
          errorType,
        });
        
        // Include error in results for transparency
        results[apiCall.apiId] = { 
          error: error.message, 
          success: false,
          errorType,
        };
      }
    }

    // Log summary
    if (errors.length > 0) {
      console.warn(`⚠️ [API Execution] ${errors.length}/${apiCalls.length} calls failed`);
      errors.forEach(e => {
        console.warn(`  - ${e.apiId} (${e.errorType}): ${e.error}`);
      });
    }

    return results;
  }

  /**
   * ✅ IMPROVED: Merge UI components with structured approach
   * Supports: REPLACE markers, Section IDs, semantic insertion
   */
  private mergeUIComponents(baseUI: string, newUI: string): string {
    console.log('[UI Merge] Starting merge operation...');
    
    // Strategy 1: Check for explicit REPLACE markers (highest priority)
    const replaceRegex = /<!--\s*REPLACE:\s*([\w-]+)\s*-->([\s\S]*?)<!--\s*END_REPLACE\s*-->/g;
    let match;
    let hasMarkers = false;
    let mergedUI = baseUI;
    
    while ((match = replaceRegex.exec(newUI)) !== null) {
      hasMarkers = true;
      const componentId = match[1];
      const newComponent = match[2].trim();
      
      console.log(`[UI Merge] Found REPLACE marker for: ${componentId}`);
      
      // Try multiple patterns to locate component in base UI
      const componentPatterns = [
        // 1. HTML comment markers (most reliable)
        new RegExp(`<!--\\s*${componentId}\\s*-->[\\s\\S]*?<!--\\s*END\\s*${componentId}\\s*-->`, 'i'),
        // 2. Section with id attribute
        new RegExp(`<Section[^>]*\\sid="${componentId}"[^>]*>[\\s\\S]*?</Section>`, 'i'),
        // 3. Div with data-component attribute
        new RegExp(`<div[^>]*\\sdata-component="${componentId}"[^>]*>[\\s\\S]*?</div>`, 'i'),
        // 4. Div with specific className containing the id
        new RegExp(`<div[^>]*\\sclassName="[^"]*${componentId}[^"]*"[^>]*>[\\s\\S]*?</div>`, 'i'),
      ];
      
      let replaced = false;
      for (const pattern of componentPatterns) {
        if (pattern.test(mergedUI)) {
          mergedUI = mergedUI.replace(pattern, newComponent);
          replaced = true;
          console.log(`✅ [UI Merge] Successfully replaced: ${componentId}`);
          break;
        }
      }
      
      if (!replaced) {
        console.log(`⚠️ [UI Merge] Component ${componentId} not found, appending to end`);
        mergedUI += '\n\n' + newComponent;
      }
    }
    
    if (hasMarkers) {
      return mergedUI;
    }
    
    // Strategy 2: Check for INSERT_AFTER markers (semantic insertion)
    const insertRegex = /<!--\s*INSERT_AFTER:\s*([\w-]+)\s*-->([\s\S]*?)<!--\s*END_INSERT\s*-->/g;
    let hasInsertMarkers = false;
    
    while ((match = insertRegex.exec(newUI)) !== null) {
      hasInsertMarkers = true;
      const targetId = match[1];
      const contentToInsert = match[2].trim();
      
      console.log(`[UI Merge] Found INSERT_AFTER marker for: ${targetId}`);
      
      // Find target component end position
      const targetPatterns = [
        new RegExp(`(<!--\\s*${targetId}\\s*-->[\\s\\S]*?<!--\\s*END\\s*${targetId}\\s*-->)`, 'i'),
        new RegExp(`(<Section[^>]*\\sid="${targetId}"[^>]*>[\\s\\S]*?</Section>)`, 'i'),
      ];
      
      let inserted = false;
      for (const pattern of targetPatterns) {
        const targetMatch = mergedUI.match(pattern);
        if (targetMatch) {
          const insertPosition = targetMatch.index! + targetMatch[0].length;
          mergedUI = mergedUI.slice(0, insertPosition) + '\n\n' + contentToInsert + mergedUI.slice(insertPosition);
          inserted = true;
          console.log(`✅ [UI Merge] Inserted after: ${targetId}`);
          break;
        }
      }
      
      if (!inserted) {
        console.log(`⚠️ [UI Merge] Target ${targetId} not found, appending to end`);
        mergedUI += '\n\n' + contentToInsert;
      }
    }
    
    if (hasInsertMarkers) {
      return mergedUI;
    }
    
    // Strategy 3: No markers - intelligent section detection and matching
    console.log('[UI Merge] No merge markers found, using intelligent strategies');
    
    // 3a. Check if new UI starts with a Section component with id
    const sectionMatch = newUI.match(/<Section[^>]*\sid="([\w-]+)"[^>]*>/i);
    if (sectionMatch) {
      const newSectionId = sectionMatch[1];
      console.log(`[UI Merge] Detected new section with id: ${newSectionId}`);
      
      // Check if this section already exists in base UI
      const existingSectionPattern = new RegExp(`<Section[^>]*\\sid="${newSectionId}"[^>]*>[\\s\\S]*?</Section>`, 'i');
      if (existingSectionPattern.test(mergedUI)) {
        console.log(`✅ [UI Merge] Section ${newSectionId} exists, replacing it`);
        mergedUI = mergedUI.replace(existingSectionPattern, newUI);
        return mergedUI;
      } else {
        console.log(`[UI Merge] Section ${newSectionId} is new, appending`);
        return baseUI + '\n\n' + newUI;
      }
    }
    
    // 3b. Check for similar component types (e.g., same title/heading)
    // Extract title from new UI
    const newTitleMatch = newUI.match(/<Section[^>]*\stitle="([^"]+)"|<h[1-3][^>]*>([^<]+)</i);
    if (newTitleMatch) {
      const newTitle = (newTitleMatch[1] || newTitleMatch[2] || '').trim();
      if (newTitle) {
        console.log(`[UI Merge] Detected component with title: "${newTitle}"`);
        
        // Try to find similar section in base UI by title
        const similarSectionPattern = new RegExp(
          `<Section[^>]*\\stitle="${newTitle}"[^>]*>[\\s\\S]*?</Section>`,
          'i'
        );
        if (similarSectionPattern.test(mergedUI)) {
          console.log(`✅ [UI Merge] Found similar section by title, replacing it`);
          mergedUI = mergedUI.replace(similarSectionPattern, newUI);
          return mergedUI;
        }
      }
    }
    
    // 3c. Check component types - if new UI has same component types as base
    // (e.g., both have charts, tables), this might be an update
    const hasChart = /<(Line|Bar|Pie|Area|Scatter)Chart/i.test(newUI);
    const hasTable = /<Table|<DataTable/i.test(newUI);
    const hasCards = /<Card[^>]*>|crayon-card-card/i.test(newUI);
    
    if (hasChart && /<(Line|Bar|Pie|Area|Scatter)Chart/i.test(mergedUI)) {
      console.log('[UI Merge] Both UIs contain charts, might be an update');
      // Check if new UI is significantly different (>30% char difference)
      const sizeDiff = Math.abs(newUI.length - mergedUI.length) / mergedUI.length;
      if (sizeDiff < 0.3) {
        console.log('✅ [UI Merge] Similar sizes, likely update - replacing chart section');
        // Find first chart and replace entire section containing it
        const chartPattern = /<Section[^>]*>[\\s\\S]*?<(Line|Bar|Pie|Area|Scatter)Chart[\\s\\S]*?<\/Section>/i;
        if (chartPattern.test(mergedUI)) {
          mergedUI = mergedUI.replace(chartPattern, newUI);
          return mergedUI;
        }
      }
    }
    
    // Fallback: Simple append with separator
    console.log('[UI Merge] No similar components found, appending new content to base UI');
    return baseUI + '\n\n' + newUI;
  }

  /**
   * Analyze user intent to determine UI modification strategy
   */
  private analyzeUIIntent(userPrompt: string, hasExistingUI: boolean): 'NEW' | 'ADD' | 'MODIFY' | 'REPLACE' {
    if (!hasExistingUI) return 'NEW';
    
    const prompt = userPrompt.toLowerCase();
    
    // Keywords for different intents
    const replaceKeywords = ['ricrea', 'restart', 'nuovo', 'da zero', 'ricomincia', 'cancella tutto', 'reset'];
    const addKeywords = ['aggiungi', 'add', 'mostra anche', 'includi', 'visualizza anche', 'inserisci'];
    const modifyKeywords = ['modifica', 'cambia', 'aggiorna', 'sostituisci', 'rimuovi', 'togli', 'elimina'];
    
    // Check for complete replacement
    if (replaceKeywords.some(kw => prompt.includes(kw))) {
      return 'REPLACE';
    }
    
    // Check for additions
    if (addKeywords.some(kw => prompt.includes(kw))) {
      return 'ADD';
    }
    
    // Check for modifications
    if (modifyKeywords.some(kw => prompt.includes(kw))) {
      return 'MODIFY';
    }
    
    // Default: treat as new request that might replace
    return 'REPLACE';
  }

  // analyzeFormIntent() removed - OpenAI now decides formSpec via structured output

  /**
   * Get JSON schema from Zod validators for form generation
   * Directly synced with action.validators.ts
   */
  private getSchemaForAction(actionType: string): any {
    const schemaMap: Record<string, any> = {
      'create_sales_order': CreateSalesOrderSchema,
      'create_customer': CreateCustomerSchema,
      'update_customer': UpdateCustomerSchema,
      'create_item': CreateItemSchema,
      'update_stock': UpdateStockSchema,
    };
    
    const zodSchema = schemaMap[actionType];
    if (!zodSchema) return null;
    
    // Convert Zod schema to JSON Schema for OpenAI/C1
    return zodToJsonSchema(zodSchema, {
      name: actionType,
      $refStrategy: 'none', // Inline all definitions
    });
  }

  /**
   * Stream orchestration with progressive updates
   */
  async *orchestrateStream(
    userPrompt: string,
    options: OrchestrationOptions = {}
  ): AsyncGenerator<{
    type: 'thinking' | 'tool_call' | 'data' | 'ui_chunk' | 'ui_complete' | 'text' | 'summary_message' | 'ui_action';
    content: any;
  }> {
    const { conversationHistory = [], context, currentUIContent } = options;

    // Build messages with context-aware system prompt
    const messages: Message[] = [
      {
        role: 'system',
        content: this.buildSystemPrompt(context as RequestContext, !!currentUIContent),
      },
      ...conversationHistory,
      {
        role: 'user',
        content: userPrompt,
      },
    ];

    try {
      yield { type: 'thinking', content: 'Planning response...' };

      // Step 1: Call OpenAI with structured output for planning
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: messages as any,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'orchestration_output',
            strict: true,
            schema: ORCHESTRATION_OUTPUT_SCHEMA,
          },
        },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const orchestrationOutput: OrchestrationOutput = JSON.parse(content);

      // Yield thinking if present
      if (orchestrationOutput.thinking) {
        yield { type: 'thinking', content: orchestrationOutput.thinking };
      }

      // Step 2: Execute API calls if specified
      let fetchedData: any = null;
      if (orchestrationOutput.apiCalls && orchestrationOutput.apiCalls.length > 0) {
        for (const apiCall of orchestrationOutput.apiCalls) {
          yield { type: 'tool_call', content: { name: apiCall.apiId, reason: apiCall.reason } };
        }

        yield { type: 'thinking', content: 'Fetching data...' };
        fetchedData = await this.executeApiCalls(orchestrationOutput.apiCalls, context as RequestContext);
        yield { type: 'data', content: fetchedData };
      }

      // Step 3: Route based on response format
      if (orchestrationOutput.responseFormat === 'ui' && orchestrationOutput.uiSpec) {
        // Generate UI with C1
        const uiAction = this.analyzeUIIntent(userPrompt, !!options.currentUIContent);
        
        yield { 
          type: 'ui_action', 
          content: { 
            action: uiAction,
            hasExisting: !!options.currentUIContent,
          } 
        };
        
        yield { type: 'thinking', content: 'Generating interactive UI...' };

        // Build prompt with uiSpec from OpenAI
        let enhancedPrompt = `${userPrompt}

UI Specification from planning:
- Type: ${orchestrationOutput.uiSpec.type}
- Data: ${orchestrationOutput.uiSpec.dataDescription}
${orchestrationOutput.uiSpec.highlights ? `- Highlights: ${orchestrationOutput.uiSpec.highlights.join(', ')}` : ''}
${orchestrationOutput.uiSpec.chartType ? `- Chart: ${orchestrationOutput.uiSpec.chartType}` : ''}`;

        const c1Context = (uiAction === 'ADD' || uiAction === 'MODIFY') ? options.currentUIContent : undefined;
        
        let newUIContent = '';
        for await (const chunk of c1Service.generateUIStream({
          prompt: enhancedPrompt,
          data: fetchedData || {},
          conversationHistory: conversationHistory as any,
          currentUIContent: c1Context,
          uiAction,
          uiSpec: orchestrationOutput.uiSpec,
        })) {
          if (chunk.type === 'artifact' || chunk.type === 'content') {
            newUIContent += chunk.content;
          }
        }

        // ✅ IMPROVED: Merge UI with intelligent strategy
        let finalUIContent = '';
        if (uiAction === 'NEW' || uiAction === 'REPLACE' || !options.currentUIContent) {
          console.log(`[UI Strategy] ${uiAction}: Using new UI content directly`);
          finalUIContent = newUIContent;
        } else if (uiAction === 'ADD') {
          console.log('[UI Strategy] ADD: Appending new content to existing UI');
          // Simple append - newUIContent may contain INSERT_AFTER markers for smart placement
          finalUIContent = this.mergeUIComponents(options.currentUIContent, newUIContent);
        } else if (uiAction === 'MODIFY') {
          console.log('[UI Strategy] MODIFY: Merging with component replacement');
          // Smart merge - newUIContent should contain REPLACE markers for specific components
          finalUIContent = this.mergeUIComponents(options.currentUIContent, newUIContent);
        }

        // Signal that this is a UI response (for layoutIntent determination)
        yield { type: 'ui_chunk', content: finalUIContent };
        yield { type: 'ui_complete', content: finalUIContent };

        // Generate summary message
        const summaryResponse = await this.client.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `Scrivi un messaggio breve (2-3 frasi) che riassuma gli insight chiave dalla UI generata. Usa un tono amichevole e professionale.`,
            },
            {
              role: 'user',
              content: `Query: "${userPrompt}"\nUI: ${finalUIContent.substring(0, 2000)}...\n\nRiassumi i dati chiave.`,
            },
          ],
        });

        yield { type: 'summary_message', content: summaryResponse.choices[0].message.content || 'UI creata!' };
        
      } else if (orchestrationOutput.responseFormat === 'form' && orchestrationOutput.formSpec) {
        // Generate form with C1
        yield { type: 'thinking', content: 'Generating form...' };

        const schema = this.getSchemaForAction(orchestrationOutput.formSpec.actionType);
        
        // Clean prefillData: remove empty strings (they cause Select validation errors)
        const cleanedPrefillData = orchestrationOutput.formSpec.prefillData 
          ? Object.fromEntries(
              Object.entries(orchestrationOutput.formSpec.prefillData)
                .filter(([_, value]) => value !== '' && value !== null && value !== undefined)
            )
          : undefined;
        
        const formPrompt = `${userPrompt}

Form Specification:
- Action: ${orchestrationOutput.formSpec.actionType}
- Title: ${orchestrationOutput.formSpec.title}
- Description: ${orchestrationOutput.formSpec.description}
${cleanedPrefillData ? `- Prefill: ${JSON.stringify(cleanedPrefillData)}` : ''}

IMPORTANT: For Select/Dropdown fields, use undefined or null for empty values, NEVER use empty strings "".

JSON Schema:
${JSON.stringify(schema, null, 2)}`;

        let formContent = '';
        for await (const chunk of c1Service.generateUIStream({
          prompt: formPrompt,
          data: orchestrationOutput.formSpec,
          conversationHistory: conversationHistory as any,
          formSpec: orchestrationOutput.formSpec,
        })) {
          if (chunk.type === 'artifact' || chunk.type === 'content') {
            formContent += chunk.content;
          }
        }

        // Signal that this is a UI response (for layoutIntent determination)
        yield { type: 'ui_chunk', content: formContent };
        yield { type: 'ui_complete', content: formContent };
        yield { type: 'summary_message', content: orchestrationOutput.textResponse };
        
      } else {
        // Simple text response
        yield { type: 'text', content: orchestrationOutput.textResponse };
      }
    } catch (error: any) {
      console.error('Stream orchestration error:', error);
      throw error;
    }
  }
}

// Singleton instance
export const orchestrationService = new OpenAIOrchestrationService();
