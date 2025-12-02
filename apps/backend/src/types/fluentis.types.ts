/**
 * Fluentis WebAPI Type Definitions
 * Complete type system for all Fluentis ERP endpoints
 */

// ============================================================================
// COMMON TYPES
// ============================================================================

export type FluentisFormat = 0 | 1; // 0 = XML, 1 = JSON

export interface FluentisRequestBase {
  CompanyId?: number;
  CompanyCode?: string;
  DepartmentId?: number;
  DepartmentCode?: string;
  Format: FluentisFormat;
  FluentisFormat?: string;
}

export interface FluentisResponse<T = any> {
  Success: boolean;
  Details?: string;
  ErrorMessage?: string;
  Data?: T;
}

export interface FluentisError {
  Code?: string;
  Message: string;
  Details?: string;
  ValidationErrors?: Array<{
    Field: string;
    Message: string;
  }>;
}

// ============================================================================
// EXPORT METHOD TYPES
// ============================================================================

export interface ExportRequest extends FluentisRequestBase {
  ObjectsToExport?: Array<{ Id: number }>;
  ExportFilter?: string; // DevExpress filter syntax
  Skip?: number;
  Take?: number;
  SortField?: string;
  SortOrder?: 'asc' | 'desc';
}

export interface ExportResponse<T = any> extends FluentisResponse<T[]> {
  TotalCount?: number;
  HasMore?: boolean;
}

// ============================================================================
// IMPORT METHOD TYPES
// ============================================================================

export interface ImportRequest extends FluentisRequestBase {
  BinaryContent: string; // Base64 encoded JSON/XML
  ValidateOnly?: boolean;
  UpdateExisting?: boolean;
  IgnoreWarnings?: boolean;
}

export interface ImportResponse extends FluentisResponse {
  ImportedCount?: number;
  UpdatedCount?: number;
  SkippedCount?: number;
  ErrorCount?: number;
  Warnings?: Array<{
    RecordIndex: number;
    Message: string;
  }>;
  Errors?: Array<{
    RecordIndex: number;
    Field?: string;
    Message: string;
  }>;
}

// ============================================================================
// SERVICE METHOD TYPES (Read-Only)
// ============================================================================

export interface ServiceRequest extends FluentisRequestBase {
  [key: string]: any; // Generic parameters
}

export interface ServiceResponse<T = any> extends FluentisResponse<T> {
  ExecutionTime?: number;
  CacheHit?: boolean;
}

// ============================================================================
// OPERATION METHOD TYPES (Read-Write)
// ============================================================================

export interface OperationRequest extends FluentisRequestBase {
  [key: string]: any; // Generic parameters
}

export interface OperationResponse extends FluentisResponse {
  AffectedRecords?: number;
  GeneratedIds?: number[];
  Warnings?: string[];
}

// ============================================================================
// DEVEXPRESS FILTER TYPES
// ============================================================================

export type DevExpressOperator =
  | '=' | '==' | '!=' | '<>' | '<' | '<=' | '>' | '>='
  | 'contains' | 'notcontains' | 'startswith' | 'endswith'
  | 'in' | 'between' | 'isnull' | 'isnotnull';

export interface DevExpressFilter {
  field: string;
  operator: DevExpressOperator;
  value: any;
  logic?: 'and' | 'or';
}

export class FilterBuilder {
  private filters: string[] = [];

  equals(field: string, value: any): this {
    this.filters.push(`[${field}] == ${this.formatValue(value)}`);
    return this;
  }

  notEquals(field: string, value: any): this {
    this.filters.push(`[${field}] != ${this.formatValue(value)}`);
    return this;
  }

  greaterThan(field: string, value: any): this {
    this.filters.push(`[${field}] > ${this.formatValue(value)}`);
    return this;
  }

  greaterThanOrEqual(field: string, value: any): this {
    this.filters.push(`[${field}] >= ${this.formatValue(value)}`);
    return this;
  }

  lessThan(field: string, value: any): this {
    this.filters.push(`[${field}] < ${this.formatValue(value)}`);
    return this;
  }

  lessThanOrEqual(field: string, value: any): this {
    this.filters.push(`[${field}] <= ${this.formatValue(value)}`);
    return this;
  }

  contains(field: string, value: string): this {
    this.filters.push(`Contains([${field}], '${value}')`);
    return this;
  }

  startsWith(field: string, value: string): this {
    this.filters.push(`StartsWith([${field}], '${value}')`);
    return this;
  }

  endsWith(field: string, value: string): this {
    this.filters.push(`EndsWith([${field}], '${value}')`);
    return this;
  }

  between(field: string, min: any, max: any): this {
    this.filters.push(
      `[${field}] >= ${this.formatValue(min)} AND [${field}] <= ${this.formatValue(max)}`
    );
    return this;
  }

  dateBetween(field: string, startDate: string, endDate: string): this {
    this.filters.push(
      `[${field}] >= #!${startDate}!# AND [${field}] <= #!${endDate}!#`
    );
    return this;
  }

  isNull(field: string): this {
    this.filters.push(`[${field}] IS NULL`);
    return this;
  }

  isNotNull(field: string): this {
    this.filters.push(`[${field}] IS NOT NULL`);
    return this;
  }

  in(field: string, values: any[]): this {
    const formattedValues = values.map(v => this.formatValue(v)).join(', ');
    this.filters.push(`[${field}] IN (${formattedValues})`);
    return this;
  }

  and(): this {
    return this;
  }

  or(callback: (builder: FilterBuilder) => void): this {
    const subBuilder = new FilterBuilder();
    callback(subBuilder);
    const orFilter = `(${subBuilder.build()})`;
    this.filters.push(orFilter);
    return this;
  }

  private formatValue(value: any): string {
    if (typeof value === 'string') {
      return `'${value}'`;
    }
    if (value instanceof Date) {
      return `#!${value.toISOString().split('T')[0]}!#`;
    }
    return String(value);
  }

  build(): string {
    return this.filters.join(' AND ');
  }

  clear(): this {
    this.filters = [];
    return this;
  }
}

// ============================================================================
// ENTITY TYPES - WAREHOUSE MANAGEMENT (WM)
// ============================================================================

export interface FSItem {
  Id?: number;
  ItemCode: string;
  Description: string;
  Description2?: string;
  ItemType?: string;
  ItemCategory?: string;
  UnitOfMeasure: string;
  Active?: boolean;
  ItemClass?: string;
  ManufacturerCode?: string;
  SupplierCode?: string;
  Weight?: number;
  Volume?: number;
  CustomFields?: Record<string, any>;
}

export interface FSBillOfMaterial {
  Id?: number;
  ItemCode: string;
  Version?: number;
  ValidFrom?: string;
  ValidTo?: string;
  Active?: boolean;
  Components?: Array<{
    ItemCode: string;
    Quantity: number;
    UnitOfMeasure: string;
    ScrapPercentage?: number;
  }>;
}

export interface FSWarehousePosting {
  Id?: number;
  PostingDate: string;
  ItemCode: string;
  Quantity: number;
  UnitOfMeasure: string;
  WarehouseCode: string;
  MovementType: string;
  DocumentNumber?: string;
  Notes?: string;
  CostCenter?: string;
}

export interface FSPhysicalInventory {
  Id?: number;
  InventoryDate: string;
  WarehouseCode: string;
  Status?: string;
  Lines?: Array<{
    ItemCode: string;
    ExpectedQuantity: number;
    ActualQuantity: number;
    Variance: number;
    Notes?: string;
  }>;
}

export interface FSPicking {
  Id?: number;
  PickingNumber: string;
  PickingDate: string;
  Status?: string;
  WarehouseCode: string;
  Lines?: Array<{
    ItemCode: string;
    RequestedQuantity: number;
    PickedQuantity?: number;
    Location?: string;
  }>;
}

// Stock query result
export interface FSItemStock {
  ItemCode: string;
  ItemDescription?: string;
  WarehouseCode: string;
  AvailableQuantity: number;
  ReservedQuantity: number;
  OnOrderQuantity: number;
  AllocatedQuantity: number;
  FreeQuantity: number;
  UnitOfMeasure: string;
  LastMovementDate?: string;
}

// Availability query result
export interface FSItemAvailability {
  ItemCode: string;
  RequestedQuantity: number;
  AvailableQuantity: number;
  AvailabilityDate?: string;
  WarehouseCode?: string;
  IsAvailable: boolean;
}

// ============================================================================
// ENTITY TYPES - SALES (SD)
// ============================================================================

export interface FSSalesOrder {
  Id?: number;
  OrderNumber?: string;
  OrderDate: string;
  CustomerId: string;
  CustomerName?: string;
  Status?: string;
  TotalAmount?: number;
  Currency?: string;
  PaymentTerms?: string;
  DeliveryDate?: string;
  Notes?: string;
  Lines?: Array<{
    LineNumber?: number;
    ItemCode: string;
    Description?: string;
    Quantity: number;
    UnitPrice: number;
    DiscountPercentage?: number;
    VatPercentage?: number;
    LineTotal?: number;
  }>;
}

export interface FSSalesInvoice {
  Id?: number;
  InvoiceNumber?: string;
  InvoiceDate: string;
  CustomerId: string;
  CustomerName?: string;
  TotalAmount: number;
  VatAmount?: number;
  Currency?: string;
  PaymentTerms?: string;
  DueDate?: string;
  Status?: string;
  Lines?: Array<{
    LineNumber?: number;
    ItemCode?: string;
    Description: string;
    Quantity: number;
    UnitPrice: number;
    VatPercentage: number;
    LineTotal: number;
  }>;
}

export interface FSSalesDeliveryNote {
  Id?: number;
  DeliveryNoteNumber?: string;
  DeliveryDate: string;
  CustomerId: string;
  CustomerName?: string;
  ShippingAddress?: string;
  Status?: string;
  Lines?: Array<{
    LineNumber?: number;
    ItemCode: string;
    Description?: string;
    Quantity: number;
    UnitOfMeasure?: string;
    SourceOrderNumber?: string;
  }>;
}

export interface FSSalesOffer {
  Id?: number;
  OfferNumber?: string;
  OfferDate: string;
  CustomerId: string;
  ValidUntil?: string;
  Status?: string;
  TotalAmount?: number;
  Currency?: string;
  Lines?: Array<{
    LineNumber?: number;
    ItemCode: string;
    Description?: string;
    Quantity: number;
    UnitPrice: number;
    DiscountPercentage?: number;
  }>;
}

export interface FSSalesPriceList {
  Id?: number;
  PriceListCode: string;
  Description: string;
  ValidFrom: string;
  ValidTo?: string;
  Currency: string;
  Items?: Array<{
    ItemCode: string;
    UnitPrice: number;
    DiscountPercentage?: number;
    MinQuantity?: number;
  }>;
}

// ============================================================================
// ENTITY TYPES - PURCHASING (SCM)
// ============================================================================

export interface FSPurchaseOrder {
  Id?: number;
  OrderNumber?: string;
  OrderDate: string;
  SupplierId: string;
  SupplierName?: string;
  Status?: string;
  TotalAmount?: number;
  Currency?: string;
  DeliveryDate?: string;
  Lines?: Array<{
    LineNumber?: number;
    ItemCode: string;
    Description?: string;
    Quantity: number;
    UnitPrice: number;
    LineTotal?: number;
  }>;
}

export interface FSPurchaseInvoice {
  Id?: number;
  InvoiceNumber: string;
  InvoiceDate: string;
  SupplierId: string;
  SupplierName?: string;
  TotalAmount: number;
  VatAmount?: number;
  Currency?: string;
  DueDate?: string;
  Status?: string;
  Lines?: Array<{
    LineNumber?: number;
    ItemCode?: string;
    Description: string;
    Quantity: number;
    UnitPrice: number;
    VatPercentage: number;
    LineTotal: number;
  }>;
}

export interface FSPurchaseDeliveryNote {
  Id?: number;
  DeliveryNoteNumber: string;
  DeliveryDate: string;
  SupplierId: string;
  SupplierName?: string;
  Status?: string;
  Lines?: Array<{
    LineNumber?: number;
    ItemCode: string;
    Description?: string;
    Quantity: number;
    UnitOfMeasure?: string;
  }>;
}

export interface FSGoodsReceiptNote {
  Id?: number;
  ReceiptNumber?: string;
  ReceiptDate: string;
  SupplierId: string;
  WarehouseCode: string;
  Status?: string;
  Lines?: Array<{
    LineNumber?: number;
    ItemCode: string;
    Quantity: number;
    ReceivedQuantity?: number;
    UnitOfMeasure?: string;
  }>;
}

export interface FSPurchasePriceList {
  Id?: number;
  PriceListCode: string;
  Description: string;
  SupplierId?: string;
  ValidFrom: string;
  ValidTo?: string;
  Currency: string;
  Items?: Array<{
    ItemCode: string;
    UnitPrice: number;
    MinQuantity?: number;
  }>;
}

// ============================================================================
// ENTITY TYPES - FINANCIAL (FI)
// ============================================================================

export interface FSPosting {
  Id?: number;
  PostingDate: string;
  DocumentNumber?: string;
  Description: string;
  TotalDebit: number;
  TotalCredit: number;
  Currency?: string;
  Status?: string;
  Lines?: Array<{
    LineNumber?: number;
    AccountCode: string;
    AccountDescription?: string;
    DebitAmount: number;
    CreditAmount: number;
    CostCenter?: string;
    Notes?: string;
  }>;
}

export interface FSMaturity {
  Id?: number;
  MaturityDate: string;
  CustomerId?: string;
  SupplierId?: string;
  DocumentNumber?: string;
  Amount: number;
  Currency?: string;
  PaymentStatus?: string;
  PaymentType?: string;
  DueDate: string;
}

export interface FSLedgerAccount {
  Id?: number;
  AccountCode: string;
  Description: string;
  AccountType: string;
  ParentAccountCode?: string;
  Active?: boolean;
  Balance?: number;
}

export interface FSLedgerAccountGroup {
  Id?: number;
  GroupCode: string;
  Description: string;
  ParentGroupCode?: string;
  Active?: boolean;
}

// ============================================================================
// ENTITY TYPES - CONTACTS/REGISTERS (SH)
// ============================================================================

export interface FSContact {
  Id?: number;
  ContactCode: string;
  ContactType: 'Customer' | 'Supplier' | 'Both' | 'Other';
  CompanyName: string;
  VatNumber?: string;
  FiscalCode?: string;
  Address?: string;
  City?: string;
  PostalCode?: string;
  Province?: string;
  Country?: string;
  Phone?: string;
  Email?: string;
  PEC?: string;
  Website?: string;
  PaymentTerms?: string;
  CreditLimit?: number;
  Active?: boolean;
  Notes?: string;
}

// ============================================================================
// ENTITY TYPES - PRODUCTION (MES)
// ============================================================================

export interface FSProductionOrder {
  Id?: number;
  OrderNumber?: string;
  OrderDate: string;
  ItemCode: string;
  Quantity: number;
  PlannedStartDate?: string;
  PlannedEndDate?: string;
  ActualStartDate?: string;
  ActualEndDate?: string;
  Status?: string;
  Priority?: number;
}

export interface FSSignalItem {
  Id?: number;
  SignalDate: string;
  ProductionOrderNumber: string;
  ItemCode: string;
  QuantityProduced: number;
  QuantityScrap?: number;
  OperatorId?: string;
  MachineId?: string;
  Notes?: string;
}

// ============================================================================
// ENTITY TYPES - PRODUCTION PLANNING (MS)
// ============================================================================

export interface FSProductionCycle {
  Id?: number;
  CycleCode: string;
  Description: string;
  ItemCode?: string;
  Version?: number;
  Operations?: Array<{
    OperationNumber: number;
    Description: string;
    WorkCenterId: string;
    SetupTime?: number;
    CycleTime: number;
    WaitTime?: number;
  }>;
}

export interface FSProductionJobOrder {
  Id?: number;
  JobOrderNumber?: string;
  JobOrderDate: string;
  ItemCode: string;
  Quantity: number;
  DeliveryDate?: string;
  Status?: string;
  CustomerOrderNumber?: string;
}

export interface FSResourcesRequirementsOrder {
  Id?: number;
  OrderNumber?: string;
  ItemCode: string;
  Quantity: number;
  RequiredDate: string;
  Status?: string;
  Type?: string;
}

export interface FSMrpParameter {
  Id?: number;
  ItemCode: string;
  MinStock?: number;
  MaxStock?: number;
  ReorderPoint?: number;
  SafetyStock?: number;
  LeadTime?: number;
  LotSize?: number;
}

// ============================================================================
// ENTITY TYPES - PROJECTS (PM)
// ============================================================================

export interface FSProject {
  Id?: number;
  ProjectCode: string;
  Description: string;
  CustomerId?: string;
  StartDate?: string;
  EndDate?: string;
  PlannedCost?: number;
  ActualCost?: number;
  Status?: string;
}

export interface FSProjectResourceActivity {
  Id?: number;
  ProjectCode: string;
  ActivityCode: string;
  ResourceId: string;
  Date: string;
  Hours: number;
  Description?: string;
  CostRate?: number;
}

export interface FSWorkReport {
  Id?: number;
  ReportDate: string;
  EmployeeId: string;
  ProjectCode?: string;
  ActivityCode?: string;
  Hours: number;
  Description?: string;
}

export interface FSOpenTask {
  Id?: number;
  TaskCode: string;
  Description: string;
  ProjectCode?: string;
  AssignedTo?: string;
  Status?: string;
  Priority?: number;
  DueDate?: string;
}

// ============================================================================
// ENTITY TYPES - QUALITY (QY)
// ============================================================================

export interface FSControlPlan {
  Id?: number;
  PlanCode: string;
  Description: string;
  ItemCode?: string;
  Active?: boolean;
}

export interface FSItemControl {
  Id?: number;
  ControlDate: string;
  ItemCode: string;
  LotNumber?: string;
  ControlResult?: string;
  Notes?: string;
}

export interface FSCalibration {
  Id?: number;
  InstrumentId: string;
  CalibrationDate: string;
  NextCalibrationDate?: string;
  Result?: string;
  Notes?: string;
}

export interface FSMeasurementToolsRegister {
  Id?: number;
  ToolCode: string;
  Description: string;
  SerialNumber?: string;
  CalibrationFrequency?: number;
  LastCalibrationDate?: string;
}

// ============================================================================
// FLUENTIS ENDPOINTS CATALOG
// ============================================================================

export enum FluentisArea {
  SH = 'SH', // Shared Area
  FI = 'FI', // Financial
  MES = 'MES', // Manufacturing Execution System
  MS = 'MS', // Manufacturing Planning
  PM = 'PM', // Project Management
  PR = 'PR', // Risk Management
  SCM = 'SCM', // Supply Chain Management
  SCS = 'SCS', // Subcontractor Management
  SD = 'SD', // Sales
  WM = 'WM', // Warehouse Management
  QY = 'QY', // Quality Management
  CRM = 'CRM', // Customer Relationship Management
}

export enum FluentisMethodType {
  Import = 'Import',
  Export = 'Export',
  Service = 'Service',
  Operation = 'Operation',
}

export interface FluentisEndpoint {
  area: FluentisArea;
  module: string;
  controller: string;
  method: string;
  methodType: FluentisMethodType;
  entityType?: string;
  description: string;
  url: string;
}

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

export interface FluentisCacheConfig {
  enabled: boolean;
  ttl: number; // seconds
  keyPrefix: string;
  invalidateOnWrite: boolean;
}

export const DEFAULT_CACHE_CONFIG: Record<FluentisMethodType, FluentisCacheConfig> = {
  [FluentisMethodType.Export]: {
    enabled: true,
    ttl: 300, // 5 minutes
    keyPrefix: 'fluentis:export',
    invalidateOnWrite: false,
  },
  [FluentisMethodType.Service]: {
    enabled: true,
    ttl: 120, // 2 minutes
    keyPrefix: 'fluentis:service',
    invalidateOnWrite: false,
  },
  [FluentisMethodType.Import]: {
    enabled: false,
    ttl: 0,
    keyPrefix: 'fluentis:import',
    invalidateOnWrite: true,
  },
  [FluentisMethodType.Operation]: {
    enabled: false,
    ttl: 0,
    keyPrefix: 'fluentis:operation',
    invalidateOnWrite: true,
  },
};
