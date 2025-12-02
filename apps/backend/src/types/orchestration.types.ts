/**
 * Structured Output Types for OpenAI Orchestration
 * OpenAI returns structured decisions, backend executes
 */

/**
 * Response format decision from OpenAI
 */
export type ResponseFormat = 'text' | 'ui' | 'form';

/**
 * Layout intent for AI response bar
 */
export type LayoutIntent = 'full' | 'extended' | 'preview' | 'hidden';

/**
 * API call specification from OpenAI
 */
export interface ApiCall {
  /** API endpoint ID from catalog */
  apiId: string;
  
  /** Human-readable reason for calling this API */
  reason: string;
  
  /** Parameters to pass (will be merged with context) */
  parameters: Record<string, any>;
  
  /** Expected data structure from API response */
  expectedData?: string;
}

/**
 * UI generation specification from OpenAI
 * Describes WHAT to show, not HOW to show it
 */
export interface UiSpec {
  /** Type of visualization needed */
  type: 'table' | 'chart' | 'cards' | 'timeline' | 'metrics' | 'mixed';
  
  /** What data to visualize */
  dataDescription: string;
  
  /** Key insights or patterns to highlight */
  highlights?: string[];
  
  /** Chart type if type='chart' */
  chartType?: 'bar' | 'line' | 'pie' | 'area' | 'scatter';
  
  /** Suggested grouping/aggregation */
  groupBy?: string;
  
  /** Suggested sorting */
  sortBy?: { field: string; direction: 'asc' | 'desc' };
  
  /** Any filters to apply */
  filters?: Record<string, any>;
}

/**
 * Form generation specification from OpenAI
 * Describes WHAT form fields are needed for write operation
 */
export interface FormSpec {
  /** Action type from action.validators.ts */
  actionType: 'create_sales_order' | 'create_customer' | 'update_customer' | 'create_item' | 'update_stock';
  
  /** Form title */
  title: string;
  
  /** Form description/purpose */
  description: string;
  
  /** Pre-filled field values (if any) */
  prefillData?: Record<string, any>;
  
  /** Additional field hints */
  fieldHints?: Record<string, string>;
  
  /** Fields to hide (already inferred from context) */
  hiddenFields?: string[];
}

/**
 * Error information from OpenAI
 */
export interface ErrorResponse {
  /** Error type */
  type: 'clarification_needed' | 'insufficient_data' | 'operation_failed';
  
  /** Error message to show user */
  message: string;
  
  /** Follow-up question to ask user */
  clarificationQuestion?: string;
  
  /** Suggested actions */
  suggestions?: string[];
}

/**
 * Complete structured output from OpenAI
 */
export interface OrchestrationOutput {
  /** Thinking/reasoning (optional, for transparency) */
  thinking?: string;
  
  /** Response format decision */
  responseFormat: ResponseFormat;
  
  /** Layout intent for response bar */
  layoutIntent: LayoutIntent;
  
  /** Text response (always present) */
  textResponse: string;
  
  /** API calls to execute (if any) */
  apiCalls?: ApiCall[];
  
  /** UI specification (if responseFormat='ui') */
  uiSpec?: UiSpec;
  
  /** Form specification (if responseFormat='form') */
  formSpec?: FormSpec;
  
  /** Error information (if operation failed) */
  error?: ErrorResponse;
  
  /** Whether UI should be suggested for this response */
  suggestUI?: boolean;
}

/**
 * JSON Schema for OpenAI structured output
 */
export const ORCHESTRATION_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    thinking: {
      type: 'string',
      description: 'Internal reasoning about the response (optional, for complex queries)',
    },
    responseFormat: {
      type: 'string',
      enum: ['text', 'ui', 'form'],
      description: 'Format of response: text=simple answer, ui=data visualization, form=write operation needs input',
    },
    layoutIntent: {
      type: 'string',
      enum: ['full', 'extended', 'preview', 'hidden'],
      description: 'AI response bar layout: full=fullscreen, extended=large overlay, preview=compact, hidden=UI only',
    },
    textResponse: {
      type: 'string',
      description: 'The main text response to show user',
    },
    apiCalls: {
      type: 'array',
      description: 'APIs to call to fulfill the request (optional)',
      items: {
        type: 'object',
        properties: {
          apiId: {
            type: 'string',
            description: 'API endpoint ID from catalog',
          },
          reason: {
            type: 'string',
            description: 'Why this API is being called',
          },
          parameters: {
            type: 'object',
            description: 'Parameters to pass (context will be auto-added)',
            properties: {},
            additionalProperties: false,
          },
          expectedData: {
            type: 'string',
            description: 'What data structure to expect back',
          },
        },
        required: ['apiId', 'reason', 'parameters', 'expectedData'],
        additionalProperties: false,
      },
    },
    uiSpec: {
      type: 'object',
      description: 'UI generation specification (if responseFormat=ui)',
      properties: {
        type: {
          type: 'string',
          enum: ['table', 'chart', 'cards', 'timeline', 'metrics', 'mixed'],
          description: 'Type of visualization',
        },
        dataDescription: {
          type: 'string',
          description: 'What data to visualize',
        },
        highlights: {
          type: 'array',
          items: { type: 'string' },
          description: 'Key insights to highlight',
        },
        chartType: {
          type: 'string',
          enum: ['bar', 'line', 'pie', 'area', 'scatter'],
          description: 'Chart type if type=chart',
        },
        groupBy: {
          type: 'string',
          description: 'Group data by this field',
        },
        sortBy: {
          type: 'object',
          properties: {
            field: { type: 'string' },
            direction: { type: 'string', enum: ['asc', 'desc'] },
          },
          required: ['field', 'direction'],
          additionalProperties: false,
        },
        filters: {
          type: 'object',
          description: 'Filters to apply to data',
          properties: {},
          additionalProperties: false,
        },
      },
      required: ['type', 'dataDescription', 'highlights', 'chartType', 'groupBy', 'sortBy', 'filters'],
      additionalProperties: false,
    },
    formSpec: {
      type: 'object',
      description: 'Form generation specification (if responseFormat=form)',
      properties: {
        actionType: {
          type: 'string',
          enum: ['create_sales_order', 'create_customer', 'update_customer', 'create_item', 'update_stock'],
          description: 'Action type from validators',
        },
        title: {
          type: 'string',
          description: 'Form title',
        },
        description: {
          type: 'string',
          description: 'Form description',
        },
        prefillData: {
          type: 'object',
          description: 'Pre-filled values',
          properties: {},
          additionalProperties: false,
        },
        fieldHints: {
          type: 'object',
          description: 'Additional hints for fields',
          properties: {},
          additionalProperties: false,
        },
        hiddenFields: {
          type: 'array',
          items: { type: 'string' },
          description: 'Fields to hide',
        },
      },
      required: ['actionType', 'title', 'description', 'prefillData', 'fieldHints', 'hiddenFields'],
      additionalProperties: false,
    },
    error: {
      type: 'object',
      description: 'Error information if operation failed',
      properties: {
        type: {
          type: 'string',
          enum: ['clarification_needed', 'insufficient_data', 'operation_failed'],
        },
        message: {
          type: 'string',
          description: 'Error message',
        },
        clarificationQuestion: {
          type: 'string',
          description: 'Question to ask user',
        },
        suggestions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Suggested actions',
        },
      },
      required: ['type', 'message', 'clarificationQuestion', 'suggestions'],
      additionalProperties: false,
    },
    suggestUI: {
      type: 'boolean',
      description: 'Whether to suggest UI visualization',
    },
  },
  required: ['thinking', 'responseFormat', 'layoutIntent', 'textResponse', 'apiCalls', 'uiSpec', 'formSpec', 'error', 'suggestUI'],
  additionalProperties: false,
} as const;
