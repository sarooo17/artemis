/**
 * Tool Service - Executes tool calls for C1 and OpenAI
 * Implements: calculate, format, get_icon
 */

export interface CalculateParams {
  operation: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'percentage' | 'total_with_tax' | 'total_with_discount';
  values?: number[];
  field?: string;
  items?: Array<{
    quantity?: number;
    unitPrice?: number;
    discount?: number;
    tax?: number;
  }>;
  taxRate?: number;
  discountRate?: number;
  baseValue?: number;
  percentageOf?: number;
}

export interface FormatParams {
  type: 'currency' | 'date' | 'number' | 'percentage' | 'relative_date';
  value: string | number;
  locale?: string;
  currency?: string;
  decimals?: number;
  dateFormat?: 'short' | 'medium' | 'long' | 'full';
}

export interface GetIconParams {
  context: string;
  status?: string;
  variant?: 'default' | 'outline' | 'filled';
}

export class ToolService {
  /**
   * Calculate numeric values
   */
  async calculate(params: CalculateParams): Promise<any> {
    const { operation, values = [], field, items = [], taxRate, discountRate, baseValue, percentageOf } = params;

    try {
      switch (operation) {
        case 'sum': {
          const nums = values.length > 0 ? values : [];
          return {
            operation: 'sum',
            result: nums.reduce((acc, val) => acc + val, 0),
            count: nums.length
          };
        }

        case 'avg': {
          const nums = values.length > 0 ? values : [];
          if (nums.length === 0) return { operation: 'avg', result: 0, count: 0 };
          const sum = nums.reduce((acc, val) => acc + val, 0);
          return {
            operation: 'avg',
            result: sum / nums.length,
            count: nums.length
          };
        }

        case 'min': {
          const nums = values.length > 0 ? values : [];
          return {
            operation: 'min',
            result: nums.length > 0 ? Math.min(...nums) : 0,
            count: nums.length
          };
        }

        case 'max': {
          const nums = values.length > 0 ? values : [];
          return {
            operation: 'max',
            result: nums.length > 0 ? Math.max(...nums) : 0,
            count: nums.length
          };
        }

        case 'count': {
          return {
            operation: 'count',
            result: values.length
          };
        }

        case 'percentage': {
          if (baseValue === undefined || percentageOf === undefined) {
            throw new Error('baseValue and percentageOf required for percentage calculation');
          }
          return {
            operation: 'percentage',
            result: percentageOf !== 0 ? (baseValue / percentageOf) * 100 : 0,
            baseValue,
            percentageOf
          };
        }

        case 'total_with_tax': {
          let subtotal = 0;
          let totalTax = 0;

          for (const item of items) {
            const qty = item.quantity || 1;
            const price = item.unitPrice || 0;
            const itemSubtotal = qty * price;
            const itemTax = itemSubtotal * ((item.tax || taxRate || 0) / 100);
            
            subtotal += itemSubtotal;
            totalTax += itemTax;
          }

          return {
            operation: 'total_with_tax',
            subtotal,
            tax: totalTax,
            total: subtotal + totalTax,
            itemCount: items.length
          };
        }

        case 'total_with_discount': {
          let subtotal = 0;
          let totalDiscount = 0;

          for (const item of items) {
            const qty = item.quantity || 1;
            const price = item.unitPrice || 0;
            const itemSubtotal = qty * price;
            const itemDiscount = itemSubtotal * ((item.discount || discountRate || 0) / 100);
            
            subtotal += itemSubtotal;
            totalDiscount += itemDiscount;
          }

          return {
            operation: 'total_with_discount',
            subtotal,
            discount: totalDiscount,
            total: subtotal - totalDiscount,
            itemCount: items.length
          };
        }

        default:
          throw new Error(`Unknown calculation operation: ${operation}`);
      }
    } catch (error: any) {
      console.error('[Tool] Calculate error:', error.message);
      return {
        error: error.message,
        operation
      };
    }
  }

  /**
   * Format values for display
   */
  async format(params: FormatParams): Promise<any> {
    const { type, value, locale = 'it-IT', currency = 'EUR', decimals, dateFormat = 'medium' } = params;

    try {
      switch (type) {
        case 'currency': {
          const num = typeof value === 'string' ? parseFloat(value) : value;
          if (isNaN(num)) throw new Error('Invalid number for currency formatting');
          
          const formatted = new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
            minimumFractionDigits: decimals !== undefined ? decimals : 2,
            maximumFractionDigits: decimals !== undefined ? decimals : 2
          }).format(num);

          return {
            type: 'currency',
            original: value,
            formatted,
            locale,
            currency
          };
        }

        case 'number': {
          const num = typeof value === 'string' ? parseFloat(value) : value;
          if (isNaN(num)) throw new Error('Invalid number for formatting');
          
          const formatted = new Intl.NumberFormat(locale, {
            minimumFractionDigits: decimals !== undefined ? decimals : 0,
            maximumFractionDigits: decimals !== undefined ? decimals : 2
          }).format(num);

          return {
            type: 'number',
            original: value,
            formatted,
            locale
          };
        }

        case 'percentage': {
          const num = typeof value === 'string' ? parseFloat(value) : value;
          if (isNaN(num)) throw new Error('Invalid number for percentage formatting');
          
          const formatted = new Intl.NumberFormat(locale, {
            style: 'percent',
            minimumFractionDigits: decimals !== undefined ? decimals : 0,
            maximumFractionDigits: decimals !== undefined ? decimals : 2
          }).format(num / 100);

          return {
            type: 'percentage',
            original: value,
            formatted,
            locale
          };
        }

        case 'date': {
          const date = new Date(value);
          if (isNaN(date.getTime())) throw new Error('Invalid date for formatting');
          
          const formatOptions: Intl.DateTimeFormatOptions = 
            dateFormat === 'short' ? { dateStyle: 'short' } :
            dateFormat === 'medium' ? { dateStyle: 'medium' } :
            dateFormat === 'long' ? { dateStyle: 'long' } :
            { dateStyle: 'full' };

          const formatted = new Intl.DateTimeFormat(locale, formatOptions).format(date);

          return {
            type: 'date',
            original: value,
            formatted,
            locale,
            dateFormat
          };
        }

        case 'relative_date': {
          const date = new Date(value);
          if (isNaN(date.getTime())) throw new Error('Invalid date for relative formatting');
          
          const now = new Date();
          const diffMs = now.getTime() - date.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          
          let formatted: string;
          if (diffDays === 0) {
            formatted = 'Oggi';
          } else if (diffDays === 1) {
            formatted = 'Ieri';
          } else if (diffDays === -1) {
            formatted = 'Domani';
          } else if (diffDays > 0 && diffDays < 7) {
            formatted = `${diffDays} giorni fa`;
          } else if (diffDays < 0 && diffDays > -7) {
            formatted = `Tra ${Math.abs(diffDays)} giorni`;
          } else {
            formatted = new Intl.DateTimeFormat(locale, { dateStyle: 'short' }).format(date);
          }

          return {
            type: 'relative_date',
            original: value,
            formatted,
            diffDays,
            locale
          };
        }

        default:
          throw new Error(`Unknown format type: ${type}`);
      }
    } catch (error: any) {
      console.error('[Tool] Format error:', error.message);
      return {
        error: error.message,
        type,
        original: value
      };
    }
  }

  /**
   * Get appropriate Lucide icon name for context
   */
  async getIcon(params: GetIconParams): Promise<any> {
    const { context, status, variant = 'default' } = params;

    // Icon mapping based on context and status
    const iconMap: Record<string, string> = {
      // Entities
      'order': 'file-text',
      'customer': 'user',
      'item': 'package',
      'invoice': 'file-invoice',
      'payment': 'credit-card',
      'warehouse': 'warehouse',
      'delivery': 'truck',
      'supplier': 'building-2',
      'product': 'box',
      'category': 'folder',
      
      // Status indicators
      'alert': 'alert-circle',
      'success': 'check-circle',
      'warning': 'alert-triangle',
      'info': 'info',
      'error': 'x-circle',
      'pending': 'clock',
      'completed': 'check-circle-2',
      'cancelled': 'x-circle',
      'confirmed': 'check',
      
      // Actions
      'edit': 'pencil',
      'delete': 'trash-2',
      'add': 'plus',
      'view': 'eye',
      'search': 'search',
      'filter': 'filter',
      
      // System
      'settings': 'settings',
      'user': 'user',
      'company': 'building',
      'dashboard': 'layout-dashboard',
      'report': 'file-bar-chart'
    };

    // Status-specific icon overrides
    if (status) {
      const statusLower = status.toLowerCase();
      
      if (context === 'order') {
        if (statusLower.includes('overdue') || statusLower.includes('ritardo')) {
          return { context, status, icon: 'alert-circle', color: 'red', variant };
        }
        if (statusLower.includes('confirmed') || statusLower.includes('confermato')) {
          return { context, status, icon: 'check-circle', color: 'green', variant };
        }
        if (statusLower.includes('pending') || statusLower.includes('attesa')) {
          return { context, status, icon: 'clock', color: 'orange', variant };
        }
        if (statusLower.includes('shipped') || statusLower.includes('spedito')) {
          return { context, status, icon: 'truck', color: 'blue', variant };
        }
      }
      
      if (context === 'payment') {
        if (statusLower.includes('paid') || statusLower.includes('pagato')) {
          return { context, status, icon: 'check-circle', color: 'green', variant };
        }
        if (statusLower.includes('unpaid') || statusLower.includes('non pagato')) {
          return { context, status, icon: 'alert-circle', color: 'red', variant };
        }
      }
    }

    const icon = iconMap[context.toLowerCase()] || 'circle';

    return {
      context,
      status,
      icon,
      variant
    };
  }

  /**
   * Execute a tool call by name
   */
  async executeToolCall(toolName: string, args: any): Promise<any> {
    console.log(`[Tool] Executing: ${toolName}`, args);

    try {
      switch (toolName) {
        case 'calculate':
          return await this.calculate(args);
        
        case 'format':
          return await this.format(args);
        
        case 'get_icon':
          return await this.getIcon(args);
        
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (error: any) {
      console.error(`[Tool] Error executing ${toolName}:`, error.message);
      return {
        error: error.message,
        tool: toolName
      };
    }
  }
}

// Export singleton instance
export const toolService = new ToolService();
