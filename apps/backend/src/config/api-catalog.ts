/**
 * Fluentis API Catalog
 * Complete catalog of available APIs for OpenAI to discover and select
 * OpenAI receives descriptions and decides WHICH APIs to call
 * Backend executes the actual HTTP calls via fluentisService
 * 
 * Full catalog from: https://docs.fluentis.com/Integration/docs/webApi/endpoints
 * Areas: SH (Shared), FI (Finance), Mes (Manufacturing), MS (Production), PM (Projects), 
 *        PR (Risk), Scm (Supply Chain), SCS (Subcontracting), SD (Sales), WM (Warehouse), 
 *        QY (Quality), CRM (Customer Relationship Management)
 */

export interface ApiEndpoint {
  id: string;
  area: 'SH' | 'FI' | 'Mes' | 'MS' | 'PM' | 'PR' | 'Scm' | 'SCS' | 'SD' | 'WM' | 'QY' | 'CRM';
  module: string;
  category: 'export' | 'import' | 'service' | 'operation';
  method: 'export' | 'import' | 'service' | 'operation';
  description: string;
  useCases: string[];
  parameters: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
    required: boolean;
    description: string;
    example?: any;
  }[];
  contextAware: boolean; // Uses company/user from context
  requiresConfirmation?: boolean; // Write operations need user confirmation
  examples?: string[];
}

export const FLUENTIS_API_CATALOG: ApiEndpoint[] = [
  // ========== SH AREA: SHARED ==========
  // Common Module
  {
    id: 'export_ledger_account_groups',
    area: 'SH',
    module: 'Common',
    category: 'export',
    method: 'export',
    description: 'Export Ledger Account Groups from accounting system',
    useCases: ['View chart of accounts structure', 'Export accounting groups', 'Analyze account hierarchy'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'SH' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSLedgerAccountGroup' },
      { name: 'filter', type: 'string', required: false, description: 'DevExpress filter', example: '[Active] = true' },
    ],
    contextAware: true,
    examples: ['Show all account groups', 'Export chart of accounts structure'],
  },
  {
    id: 'import_ledger_account_groups',
    area: 'SH',
    module: 'Common',
    category: 'import',
    method: 'import',
    description: 'Import Ledger Account Groups into accounting system',
    useCases: ['Create account groups', 'Update account hierarchy', 'Import chart of accounts'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'SH' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSLedgerAccountGroup' },
      { name: 'data', type: 'object', required: true, description: 'Account group data', example: { groupCode: 'GRP001', description: 'Assets' } },
    ],
    contextAware: true,
    requiresConfirmation: true,
  },
  {
    id: 'export_ledger_accounts',
    area: 'SH',
    module: 'Common',
    category: 'export',
    method: 'export',
    description: 'Export Ledger Accounts (chart of accounts)',
    useCases: ['View all accounts', 'Export account list', 'Check account details'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'SH' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSLedgerAccount' },
      { name: 'filter', type: 'string', required: false, description: 'DevExpress filter', example: '[AccountType] = "Asset"' },
    ],
    contextAware: true,
    examples: ['Show all ledger accounts', 'Export active accounts'],
  },
  {
    id: 'import_ledger_accounts',
    area: 'SH',
    module: 'Common',
    category: 'import',
    method: 'import',
    description: 'Import Ledger Accounts into chart of accounts',
    useCases: ['Create new accounts', 'Update account details', 'Import account list'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'SH' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSLedgerAccount' },
      { name: 'data', type: 'object', required: true, description: 'Account data', example: { accountCode: 'ACC001', description: 'Cash' } },
    ],
    contextAware: true,
    requiresConfirmation: true,
  },
  {
    id: 'export_sdi_documents',
    area: 'SH',
    module: 'Common',
    category: 'export',
    method: 'export',
    description: 'Export SDI (Sistema di Interscambio) electronic invoice documents',
    useCases: ['Export electronic invoices', 'View SDI documents', 'Check invoice status'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'SH' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSSdiDocument' },
      { name: 'filter', type: 'string', required: false, description: 'Filter by status/date', example: '[Status] = "Sent"' },
    ],
    contextAware: true,
    examples: ['Show sent electronic invoices', 'Export SDI documents'],
  },
  {
    id: 'import_sdi_documents',
    area: 'SH',
    module: 'Common',
    category: 'import',
    method: 'import',
    description: 'Import SDI electronic invoice documents',
    useCases: ['Import received invoices', 'Load SDI documents'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'SH' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSSdiDocument' },
      { name: 'data', type: 'object', required: true, description: 'SDI document data' },
    ],
    contextAware: true,
    requiresConfirmation: true,
  },
  {
    id: 'export_contacts',
    area: 'SH',
    module: 'Register Management',
    category: 'export',
    method: 'export',
    description: 'Export contacts/registers (customers, suppliers, all business entities)',
    useCases: ['Browse all contacts', 'Export customer/supplier list', 'View business partners'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'SH' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSContact' },
      { name: 'filter', type: 'string', required: false, description: 'Filter by type/status', example: '[ContactType] = "Customer"' },
    ],
    contextAware: true,
    examples: ['Show all contacts', 'Export customer list', 'Find suppliers'],
  },
  {
    id: 'import_contacts',
    area: 'SH',
    module: 'Register Management',
    category: 'import',
    method: 'import',
    description: 'Import contacts/registers',
    useCases: ['Create contact', 'Import customer/supplier', 'Register new business entity'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'SH' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSContact' },
      { name: 'data', type: 'object', required: true, description: 'Contact data with type, name, details' },
    ],
    contextAware: true,
    requiresConfirmation: true,
  },

  // ========== FI AREA: FINANCE ==========
  {
    id: 'export_postings',
    area: 'FI',
    module: 'GeneralLedger',
    category: 'export',
    method: 'export',
    description: 'Export General Ledger accounting postings/journal entries',
    useCases: ['View GL postings', 'Export journal entries', 'Analyze accounting transactions'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'FI' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSPosting' },
      { name: 'filter', type: 'string', required: false, description: 'Filter by date/account', example: '[PostingDate] >= "2024-01-01"' },
      { name: 'dateFrom', type: 'date', required: false, description: 'Start date' },
      { name: 'dateTo', type: 'date', required: false, description: 'End date' },
    ],
    contextAware: true,
    examples: ['Show postings from last month', 'Export GL entries'],
  },
  {
    id: 'import_postings',
    area: 'FI',
    module: 'GeneralLedger',
    category: 'import',
    method: 'import',
    description: 'Import General Ledger postings/journal entries',
    useCases: ['Create GL posting', 'Import journal entries', 'Record accounting transaction'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'FI' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSPosting' },
      { name: 'data', type: 'object', required: true, description: 'Posting data with accounts, amounts, date' },
    ],
    contextAware: true,
    requiresConfirmation: true,
  },
  {
    id: 'export_maturities',
    area: 'FI',
    module: 'GeneralLedger',
    category: 'export',
    method: 'export',
    description: 'Export payables and receivables (maturities/due dates)',
    useCases: ['View due payments', 'Export payables/receivables', 'Check payment schedule'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'FI' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSMaturityOnDate' },
      { name: 'filter', type: 'string', required: false, description: 'Filter by due date/type', example: '[DueDate] <= "2024-12-31"' },
    ],
    contextAware: true,
    examples: ['Show upcoming payments', 'Export receivables'],
  },
  {
    id: 'import_maturities',
    area: 'FI',
    module: 'GeneralLedger',
    category: 'import',
    method: 'import',
    description: 'Import payables and receivables',
    useCases: ['Record payment due', 'Import maturity schedule'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'FI' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSMaturity' },
      { name: 'data', type: 'object', required: true, description: 'Maturity data with due date, amount' },
    ],
    contextAware: true,
    requiresConfirmation: true,
  },

  // ========== SD AREA: SALES ==========
  {
    id: 'export_sales_orders',
    area: 'SD',
    module: 'SalesOrders',
    category: 'export',
    method: 'export',
    description: 'Export sales orders from Fluentis ERP with filtering and date ranges',
    useCases: ['Show recent orders', 'Analyze sales performance', 'Track revenue', 'Find orders by customer'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'SD' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSSalesOrders' },
      { name: 'filter', type: 'string', required: false, description: 'DevExpress filter', example: '[CustomerId] = "CUST001"' },
      { name: 'dateFrom', type: 'date', required: false, description: 'Start date (YYYY-MM-DD)', example: '2024-01-01' },
      { name: 'dateTo', type: 'date', required: false, description: 'End date (YYYY-MM-DD)', example: '2024-12-31' },
    ],
    contextAware: true,
    examples: ['Show sales orders from last month', 'Recent orders for customer ACME', 'Show all pending orders'],
  },
  {
    id: 'import_sales_orders',
    area: 'SD',
    module: 'SalesOrders',
    category: 'import',
    method: 'import',
    description: 'Import/create new sales orders',
    useCases: ['Create sales order', 'Place customer order', 'Import order from external system'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'SD' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSSalesOrders' },
      { name: 'data', type: 'object', required: true, description: 'Order data with customer, items, dates' },
    ],
    contextAware: true,
    requiresConfirmation: true,
    examples: ['Create order for customer X', 'Place order for 50 units of product Y'],
  },
  {
    id: 'export_sales_invoices',
    area: 'SD',
    module: 'SalesInvoices',
    category: 'export',
    method: 'export',
    description: 'Export sales invoices',
    useCases: ['View invoices', 'Analyze revenue', 'Export invoice list', 'Check invoice status'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'SD' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSSalesInvoice' },
      { name: 'filter', type: 'string', required: false, description: 'Filter by customer/status/date' },
    ],
    contextAware: true,
    examples: ['Show invoices from last quarter', 'Export customer invoices'],
  },
  {
    id: 'import_sales_invoices',
    area: 'SD',
    module: 'SalesInvoices',
    category: 'import',
    method: 'import',
    description: 'Import/create sales invoices',
    useCases: ['Create invoice', 'Import invoice', 'Generate invoice from order'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'SD' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSSalesInvoice' },
      { name: 'data', type: 'object', required: true, description: 'Invoice data' },
    ],
    contextAware: true,
    requiresConfirmation: true,
  },
  {
    id: 'export_sales_delivery_notes',
    area: 'SD',
    module: 'SalesDeliveryNotes',
    category: 'export',
    method: 'export',
    description: 'Export sales delivery notes (DDT)',
    useCases: ['View delivery notes', 'Track shipments', 'Export delivery documents'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'SD' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSSalesDeliveryNote' },
      { name: 'filter', type: 'string', required: false, description: 'Filter by customer/date' },
    ],
    contextAware: true,
    examples: ['Show recent delivery notes', 'Export shipment documents'],
  },
  {
    id: 'import_sales_delivery_notes',
    area: 'SD',
    module: 'SalesDeliveryNotes',
    category: 'import',
    method: 'import',
    description: 'Import/create sales delivery notes',
    useCases: ['Create delivery note', 'Register shipment'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'SD' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSSalesDeliveryNote' },
      { name: 'data', type: 'object', required: true, description: 'Delivery note data' },
    ],
    contextAware: true,
    requiresConfirmation: true,
  },
  {
    id: 'export_sales_offers',
    area: 'SD',
    module: 'SalesOffers',
    category: 'export',
    method: 'export',
    description: 'Export sales offers/quotations',
    useCases: ['View quotations', 'Track sales opportunities', 'Export offers'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'SD' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSSalesOffer' },
      { name: 'filter', type: 'string', required: false, description: 'Filter by customer/status' },
    ],
    contextAware: true,
    examples: ['Show active quotations', 'Export pending offers'],
  },
  {
    id: 'import_sales_offers',
    area: 'SD',
    module: 'SalesOffers',
    category: 'import',
    method: 'import',
    description: 'Import/create sales offers',
    useCases: ['Create quotation', 'Register sales offer'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'SD' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSSalesOffer' },
      { name: 'data', type: 'object', required: true, description: 'Offer data' },
    ],
    contextAware: true,
    requiresConfirmation: true,
  },
  {
    id: 'export_sales_price_lists',
    area: 'SD',
    module: 'SalesPriceLists',
    category: 'export',
    method: 'export',
    description: 'Export sales price lists',
    useCases: ['View prices', 'Check customer prices', 'Export price list'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'SD' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSSalesPriceList' },
      { name: 'filter', type: 'string', required: false, description: 'Filter by customer/item' },
    ],
    contextAware: true,
    examples: ['Show sales price list', 'What are prices for customer X?'],
  },
  {
    id: 'import_sales_price_lists',
    area: 'SD',
    module: 'SalesPriceLists',
    category: 'import',
    method: 'import',
    description: 'Import/create sales price lists',
    useCases: ['Update prices', 'Create price list', 'Import pricing'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'SD' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSSalesPriceList' },
      { name: 'data', type: 'object', required: true, description: 'Price list data' },
    ],
    contextAware: true,
    requiresConfirmation: true,
  },

  // ========== WM AREA: WAREHOUSE MANAGEMENT ==========
  {
    id: 'export_items',
    area: 'WM',
    module: 'Common',
    category: 'export',
    method: 'export',
    description: 'Export items/products from catalog',
    useCases: ['Browse products', 'Search items', 'View catalog', 'Check product details'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'WM' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSItem' },
      { name: 'filter', type: 'string', required: false, description: 'Filter by category/status' },
    ],
    contextAware: true,
    examples: ['Show all products', 'Find items over €100', 'What products do we sell?'],
  },
  {
    id: 'import_items',
    area: 'WM',
    module: 'Common',
    category: 'import',
    method: 'import',
    description: 'Import/create items in catalog',
    useCases: ['Add product', 'Create item', 'Import catalog'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'WM' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSItem' },
      { name: 'data', type: 'object', required: true, description: 'Item data' },
    ],
    contextAware: true,
    requiresConfirmation: true,
  },
  {
    id: 'export_bill_of_materials',
    area: 'WM',
    module: 'Common',
    category: 'export',
    method: 'export',
    description: 'Export Bill of Materials (BOM)',
    useCases: ['View BOM', 'Check components', 'Export product structure'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'WM' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSBillOfMaterial' },
      { name: 'filter', type: 'string', required: false, description: 'Filter by item' },
    ],
    contextAware: true,
    examples: ['Show BOM for product X', 'What components are needed?'],
  },
  {
    id: 'import_bill_of_materials',
    area: 'WM',
    module: 'Common',
    category: 'import',
    method: 'import',
    description: 'Import/create Bill of Materials',
    useCases: ['Create BOM', 'Update structure', 'Define components'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'WM' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSBillOfMaterial' },
      { name: 'data', type: 'object', required: true, description: 'BOM data' },
    ],
    contextAware: true,
    requiresConfirmation: true,
  },
  {
    id: 'export_warehouse_postings',
    area: 'WM',
    module: 'WarehouseManagement',
    category: 'export',
    method: 'export',
    description: 'Export warehouse inventory movements',
    useCases: ['View stock movements', 'Track inventory', 'Export transactions'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'WM' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSWarehousePosting' },
      { name: 'filter', type: 'string', required: false, description: 'Filter by item/date/warehouse' },
    ],
    contextAware: true,
    examples: ['Show today stock movements', 'Export warehouse transactions'],
  },
  {
    id: 'import_warehouse_postings',
    area: 'WM',
    module: 'WarehouseManagement',
    category: 'import',
    method: 'import',
    description: 'Import warehouse movements',
    useCases: ['Register movement', 'Adjust stock', 'Import transaction'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'WM' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSWarehousePosting' },
      { name: 'data', type: 'object', required: true, description: 'Movement data' },
    ],
    contextAware: true,
    requiresConfirmation: true,
  },
  {
    id: 'export_pickings',
    area: 'WM',
    module: 'Pickings',
    category: 'export',
    method: 'export',
    description: 'Export picking lists',
    useCases: ['View pickings', 'Track warehouse picks', 'Export pick orders'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'WM' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSPicking' },
      { name: 'filter', type: 'string', required: false, description: 'Filter by status/date' },
    ],
    contextAware: true,
    examples: ['Show pending pickings', 'Export today pick orders'],
  },
  {
    id: 'import_pickings',
    area: 'WM',
    module: 'Pickings',
    category: 'import',
    method: 'import',
    description: 'Import/create picking lists',
    useCases: ['Create picking', 'Register pick order'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'WM' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSPicking' },
      { name: 'data', type: 'object', required: true, description: 'Picking data' },
    ],
    contextAware: true,
    requiresConfirmation: true,
  },
  {
    id: 'get_items_availability',
    area: 'WM',
    module: 'Common',
    category: 'service',
    method: 'service',
    description: 'Get items availability (ATP)',
    useCases: ['Check availability', 'Verify stock', 'ATP check'],
    parameters: [
      { name: 'serviceCode', type: 'string', required: true, description: 'Service code', example: 'GetItemsAvailability' },
      { name: 'itemCode', type: 'string', required: true, description: 'Item code' },
      { name: 'requestedQuantity', type: 'number', required: true, description: 'Quantity' },
    ],
    contextAware: true,
    examples: ['Can I sell 100 units?', 'Is item X available?'],
  },
  {
    id: 'get_items_stock',
    area: 'WM',
    module: 'Common',
    category: 'service',
    method: 'service',
    description: 'Get current stock levels',
    useCases: ['Check stock', 'View inventory', 'Monitor stock'],
    parameters: [
      { name: 'serviceCode', type: 'string', required: true, description: 'Service code', example: 'GetItemsStock' },
      { name: 'itemCode', type: 'string', required: false, description: 'Item code' },
      { name: 'warehouseCode', type: 'string', required: false, description: 'Warehouse code' },
    ],
    contextAware: true,
    examples: ['What is stock for item X?', 'Show inventory'],
  },

  // ========== Scm AREA: SUPPLY CHAIN MANAGEMENT ==========
  {
    id: 'export_purchase_orders',
    area: 'Scm',
    module: 'PurchaseOrders',
    category: 'export',
    method: 'export',
    description: 'Export purchase orders',
    useCases: ['View purchase orders', 'Track supplier orders', 'Analyze procurement'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'Scm' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSPurchaseOrders' },
      { name: 'filter', type: 'string', required: false, description: 'Filter by supplier/date' },
    ],
    contextAware: true,
    examples: ['Show purchase orders', 'Export supplier orders'],
  },
  {
    id: 'import_purchase_orders',
    area: 'Scm',
    module: 'PurchaseOrders',
    category: 'import',
    method: 'import',
    description: 'Import/create purchase orders',
    useCases: ['Create purchase order', 'Order from supplier'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'Scm' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSPurchaseOrders' },
      { name: 'data', type: 'object', required: true, description: 'Purchase order data' },
    ],
    contextAware: true,
    requiresConfirmation: true,
  },
  {
    id: 'export_purchase_invoices',
    area: 'Scm',
    module: 'PurchaseInvoices',
    category: 'export',
    method: 'export',
    description: 'Export purchase invoices',
    useCases: ['View supplier invoices', 'Track payables', 'Analyze costs'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'Scm' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSPurchaseInvoice' },
      { name: 'filter', type: 'string', required: false, description: 'Filter by supplier/date' },
    ],
    contextAware: true,
    examples: ['Show purchase invoices', 'Export supplier invoices'],
  },
  {
    id: 'import_purchase_invoices',
    area: 'Scm',
    module: 'PurchaseInvoices',
    category: 'import',
    method: 'import',
    description: 'Import/create purchase invoices',
    useCases: ['Register supplier invoice', 'Import payable'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'Scm' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSPurchaseInvoice' },
      { name: 'data', type: 'object', required: true, description: 'Invoice data' },
    ],
    contextAware: true,
    requiresConfirmation: true,
  },

  // ========== Mes AREA: MANUFACTURING ==========
  {
    id: 'export_production_orders',
    area: 'Mes',
    module: 'ProductionOrders',
    category: 'export',
    method: 'export',
    description: 'Export production orders',
    useCases: ['View production orders', 'Track manufacturing', 'Check production status'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'Mes' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSProductionOrder' },
      { name: 'filter', type: 'string', required: false, description: 'Filter by status/date' },
    ],
    contextAware: true,
    examples: ['Show active production orders', 'Export manufacturing orders'],
  },
  {
    id: 'import_production_orders',
    area: 'Mes',
    module: 'ProductionOrders',
    category: 'import',
    method: 'import',
    description: 'Import/create production orders',
    useCases: ['Create production order', 'Schedule manufacturing'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'Mes' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSProductionOrder' },
      { name: 'data', type: 'object', required: true, description: 'Production order data' },
    ],
    contextAware: true,
    requiresConfirmation: true,
  },

  // ========== PM AREA: PROJECT MANAGEMENT ==========
  {
    id: 'export_projects',
    area: 'PM',
    module: 'Projects',
    category: 'export',
    method: 'export',
    description: 'Export projects',
    useCases: ['View projects', 'Track project progress', 'Export project list'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'PM' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSProject' },
      { name: 'filter', type: 'string', required: false, description: 'Filter by status/customer' },
    ],
    contextAware: true,
    examples: ['Show active projects', 'Export project list'],
  },
  {
    id: 'import_projects',
    area: 'PM',
    module: 'Projects',
    category: 'import',
    method: 'import',
    description: 'Import/create projects',
    useCases: ['Create project', 'Register new project'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'PM' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'FSProject' },
      { name: 'data', type: 'object', required: true, description: 'Project data' },
    ],
    contextAware: true,
    requiresConfirmation: true,
  },

  // ========== CRM AREA: CUSTOMER RELATIONSHIP MANAGEMENT ==========
  {
    id: 'export_crm_contacts',
    area: 'CRM',
    module: 'Common',
    category: 'export',
    method: 'export',
    description: 'Export CRM contacts',
    useCases: ['View CRM contacts', 'Export contact list', 'Manage relationships'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'CRM' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'CrmContact' },
      { name: 'filter', type: 'string', required: false, description: 'Filter by type/status' },
    ],
    contextAware: true,
    examples: ['Show CRM contacts', 'Export contact list'],
  },
  {
    id: 'import_crm_contacts',
    area: 'CRM',
    module: 'Common',
    category: 'import',
    method: 'import',
    description: 'Import/create CRM contacts',
    useCases: ['Create CRM contact', 'Register lead'],
    parameters: [
      { name: 'moduleCode', type: 'string', required: true, description: 'Module code', example: 'CRM' },
      { name: 'objectCode', type: 'string', required: true, description: 'Object code', example: 'CrmContact' },
      { name: 'data', type: 'object', required: true, description: 'Contact data' },
    ],
    contextAware: true,
    requiresConfirmation: true,
  },
];

/**
 * Get catalog description for OpenAI system prompt
 */
export function getApiCatalogDescription(): string {
  return `
# Available Fluentis APIs

You have access to the following APIs to interact with the Fluentis ERP system.
APIs are organized by functional area:
- **SH (Shared)**: Common data like accounts, contacts, SDI documents
- **FI (Finance)**: GL postings, maturities, payables/receivables
- **SD (Sales)**: Orders, invoices, delivery notes, offers, price lists, POS
- **Scm (Supply Chain)**: Purchase orders, invoices, delivery notes, demands
- **WM (Warehouse)**: Items, BOM, stock movements, pickings, inventory
- **Mes (Manufacturing)**: Production orders, signal items
- **MS (Production)**: Job orders, cycles, MRP
- **PM (Projects)**: Project management, work reports, tasks
- **PR (Risk)**: Risk management, customer blocks
- **SCS (Subcontracting)**: Subcontractor orders, returns, price lists
- **QY (Quality)**: Control plans, calibrations, corrective actions
- **CRM**: Customer relationship management

${FLUENTIS_API_CATALOG.map(
  (api) => `
## ${api.id}
**Area**: ${api.area} | **Module**: ${api.module}
**Category**: ${api.category} (${api.method})
**Description**: ${api.description}
${api.requiresConfirmation ? '⚠️ **Requires user confirmation before execution**' : ''}

**Use Cases**:
${api.useCases.map((uc) => `- ${uc}`).join('\n')}

**Parameters**:
${api.parameters
  .map(
    (p) =>
      `- ${p.name} (${p.type})${p.required ? ' *required*' : ' *optional*'}: ${p.description}${p.example ? ` | Example: ${JSON.stringify(p.example)}` : ''}`
  )
  .join('\n')}

${api.examples?.length ? `**Example Queries**:\n${api.examples.map((ex) => `- "${ex}"`).join('\n')}` : ''}
`
).join('\n---\n')}

## Important Notes:
- All APIs are context-aware: They automatically use the current user's company, department, and permissions
- WRITE operations (import/operation) require user confirmation via form generation
- READ operations (export/service) can be executed directly
- Use DevExpress filter syntax for advanced filtering
- Date parameters use YYYY-MM-DD format
- APIs organized by functional area for easier discovery
`;
}

/**
 * Get API endpoint details by ID
 */
export function getApiEndpoint(id: string): ApiEndpoint | undefined {
  return FLUENTIS_API_CATALOG.find((api) => api.id === id);
}
