/**
 * Tool Catalog for C1 and OpenAI
 * Tools available for UI generation and text responses
 */

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required: string[];
    };
  };
}

// ========== SHARED TOOLS (Available for both C1 and OpenAI) ==========

/**
 * Calculate financial and numeric values
 */
export const CALCULATE_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'calculate',
    description: 'Perform calculations on numeric data: sum, average, min, max, count, percentage, total with tax/discount',
    parameters: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['sum', 'avg', 'min', 'max', 'count', 'percentage', 'total_with_tax', 'total_with_discount'],
          description: 'The calculation operation to perform'
        },
        values: {
          type: 'array',
          items: { type: 'number' },
          description: 'Array of numbers to calculate (for sum, avg, min, max, count)'
        },
        field: {
          type: 'string',
          description: 'Field name to extract values from objects (optional)'
        },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              quantity: { type: 'number' },
              unitPrice: { type: 'number' },
              discount: { type: 'number' },
              tax: { type: 'number' }
            }
          },
          description: 'Array of items for complex calculations (total_with_tax, total_with_discount)'
        },
        taxRate: {
          type: 'number',
          description: 'Tax rate as percentage (e.g., 22 for 22%)'
        },
        discountRate: {
          type: 'number',
          description: 'Discount rate as percentage (e.g., 10 for 10%)'
        },
        baseValue: {
          type: 'number',
          description: 'Base value for percentage calculation'
        },
        percentageOf: {
          type: 'number',
          description: 'Value to calculate percentage of'
        }
      },
      required: ['operation']
    }
  }
};

/**
 * Format values for display
 */
export const FORMAT_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'format',
    description: 'Format values for display: currency, date, number, percentage with locale support',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['currency', 'date', 'number', 'percentage', 'relative_date'],
          description: 'The format type to apply'
        },
        value: {
          type: ['string', 'number'],
          description: 'The value to format'
        },
        locale: {
          type: 'string',
          default: 'it-IT',
          description: 'Locale for formatting (e.g., it-IT, en-US)'
        },
        currency: {
          type: 'string',
          default: 'EUR',
          description: 'Currency code for currency formatting (e.g., EUR, USD)'
        },
        decimals: {
          type: 'number',
          description: 'Number of decimal places (optional)'
        },
        dateFormat: {
          type: 'string',
          enum: ['short', 'medium', 'long', 'full'],
          default: 'medium',
          description: 'Date format style'
        }
      },
      required: ['type', 'value']
    }
  }
};

/**
 * Get appropriate icon for context (C1 UI only)
 */
export const GET_ICON_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'get_icon',
    description: 'Get appropriate Lucide icon name for UI context (orders, customers, alerts, status, etc.)',
    parameters: {
      type: 'object',
      properties: {
        context: {
          type: 'string',
          enum: [
            'order', 'customer', 'item', 'invoice', 'payment', 'warehouse',
            'delivery', 'supplier', 'product', 'category',
            'alert', 'success', 'warning', 'info', 'error',
            'pending', 'completed', 'cancelled', 'confirmed',
            'edit', 'delete', 'add', 'view', 'search', 'filter',
            'settings', 'user', 'company', 'dashboard', 'report'
          ],
          description: 'The context or entity type to get icon for'
        },
        status: {
          type: 'string',
          description: 'Optional status to refine icon selection (e.g., "overdue", "paid", "shipped")'
        },
        variant: {
          type: 'string',
          enum: ['default', 'outline', 'filled'],
          default: 'default',
          description: 'Icon variant style'
        }
      },
      required: ['context']
    }
  }
};

// ========== TOOL COLLECTIONS ==========

/**
 * Tools available for C1 UI generation
 * Includes both computational and UI-specific tools
 */
export const C1_TOOLS: ToolDefinition[] = [
  CALCULATE_TOOL,
  FORMAT_TOOL,
  GET_ICON_TOOL
];

/**
 * Tools available for OpenAI text responses
 * Only computational tools, no UI-specific tools
 */
export const OPENAI_TEXT_TOOLS: ToolDefinition[] = [
  CALCULATE_TOOL,
  FORMAT_TOOL
];

/**
 * Get tool definition by name
 */
export function getToolByName(name: string): ToolDefinition | undefined {
  return C1_TOOLS.find(tool => tool.function.name === name);
}
