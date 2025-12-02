/**
 * In-Memory State Management for Mock Fluentis Server
 * Simulates ERP database with Map-based storage
 */

export interface MockCustomer {
  customerId: string;
  companyName: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  vatNumber?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockItem {
  itemCode: string;
  description: string;
  category?: string;
  unitPrice?: number;
  cost?: number;
  unitOfMeasure?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockSalesOrder {
  orderId: string;
  orderNumber: number;
  customerId: string;
  customerName: string;
  orderDate: string;
  deliveryDate?: string;
  notes?: string;
  items: Array<{
    itemCode: string;
    description?: string;
    quantity: number;
    unitPrice?: number;
    discount?: number;
    total: number;
  }>;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface MockStockRecord {
  itemCode: string;
  warehouseCode: string;
  quantity: number;
  lastMovementDate: Date;
  movements: Array<{
    date: Date;
    type: 'in' | 'out' | 'adjustment';
    quantity: number;
    reason?: string;
    referenceDocument?: string;
  }>;
}

/**
 * Global in-memory database
 */
class MockDatabase {
  private customers = new Map<string, MockCustomer>();
  private items = new Map<string, MockItem>();
  private salesOrders = new Map<string, MockSalesOrder>();
  private stock = new Map<string, MockStockRecord>(); // key: itemCode:warehouseCode
  private orderCounter = 1000;

  constructor() {
    this.seedInitialData();
  }

  // ==================== CUSTOMERS ====================

  getCustomer(customerId: string): MockCustomer | undefined {
    return this.customers.get(customerId);
  }

  createCustomer(data: Omit<MockCustomer, 'createdAt' | 'updatedAt'>): MockCustomer {
    const customer: MockCustomer = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.customers.set(data.customerId, customer);
    return customer;
  }

  updateCustomer(customerId: string, data: Partial<MockCustomer>): MockCustomer | null {
    const existing = this.customers.get(customerId);
    if (!existing) return null;

    const updated: MockCustomer = {
      ...existing,
      ...data,
      customerId: existing.customerId, // prevent ID change
      updatedAt: new Date(),
    };
    this.customers.set(customerId, updated);
    return updated;
  }

  getAllCustomers(): MockCustomer[] {
    return Array.from(this.customers.values());
  }

  // ==================== ITEMS ====================

  getItem(itemCode: string): MockItem | undefined {
    return this.items.get(itemCode);
  }

  createItem(data: Omit<MockItem, 'createdAt' | 'updatedAt'>): MockItem {
    const item: MockItem = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.items.set(data.itemCode, item);
    return item;
  }

  updateItem(itemCode: string, data: Partial<MockItem>): MockItem | null {
    const existing = this.items.get(itemCode);
    if (!existing) return null;

    const updated: MockItem = {
      ...existing,
      ...data,
      itemCode: existing.itemCode, // prevent code change
      updatedAt: new Date(),
    };
    this.items.set(itemCode, updated);
    return updated;
  }

  getAllItems(): MockItem[] {
    return Array.from(this.items.values());
  }

  // ==================== SALES ORDERS ====================

  getSalesOrder(orderId: string): MockSalesOrder | undefined {
    return this.salesOrders.get(orderId);
  }

  createSalesOrder(
    data: Omit<MockSalesOrder, 'orderId' | 'orderNumber' | 'status' | 'createdAt' | 'updatedAt'>
  ): MockSalesOrder {
    const orderNumber = this.orderCounter++;
    const orderId = `SO-${new Date().getFullYear()}-${String(orderNumber).padStart(5, '0')}`;

    const order: MockSalesOrder = {
      ...data,
      orderId,
      orderNumber,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.salesOrders.set(orderId, order);
    return order;
  }

  getAllSalesOrders(): MockSalesOrder[] {
    return Array.from(this.salesOrders.values());
  }

  getCustomerOrders(customerId: string): MockSalesOrder[] {
    return Array.from(this.salesOrders.values()).filter(
      (order) => order.customerId === customerId
    );
  }

  // ==================== STOCK ====================

  getStock(itemCode: string, warehouseCode: string): MockStockRecord | undefined {
    const key = `${itemCode}:${warehouseCode}`;
    return this.stock.get(key);
  }

  updateStock(
    itemCode: string,
    warehouseCode: string,
    quantity: number,
    movementType: 'in' | 'out' | 'adjustment',
    reason?: string,
    referenceDocument?: string
  ): MockStockRecord {
    const key = `${itemCode}:${warehouseCode}`;
    let stockRecord = this.stock.get(key);

    if (!stockRecord) {
      stockRecord = {
        itemCode,
        warehouseCode,
        quantity: 0,
        lastMovementDate: new Date(),
        movements: [],
      };
    }

    // Update quantity based on movement type
    if (movementType === 'in') {
      stockRecord.quantity += quantity;
    } else if (movementType === 'out') {
      stockRecord.quantity -= quantity;
    } else {
      // adjustment
      stockRecord.quantity = quantity;
    }

    // Record movement
    stockRecord.movements.push({
      date: new Date(),
      type: movementType,
      quantity,
      reason,
      referenceDocument,
    });

    stockRecord.lastMovementDate = new Date();
    this.stock.set(key, stockRecord);
    return stockRecord;
  }

  getItemStock(itemCode: string): MockStockRecord[] {
    return Array.from(this.stock.values()).filter((record) => record.itemCode === itemCode);
  }

  getAllStock(): MockStockRecord[] {
    return Array.from(this.stock.values());
  }

  // ==================== UTILITIES ====================

  private seedInitialData() {
    // Seed some initial customers
    this.createCustomer({
      customerId: 'CUST001',
      companyName: 'Acme Corporation',
      email: 'contact@acme.com',
      phone: '+39 02 1234567',
      address: 'Via Roma 1',
      city: 'Milano',
      country: 'Italy',
      vatNumber: 'IT12345678901',
      active: true,
    });

    this.createCustomer({
      customerId: 'CUST002',
      companyName: 'TechPro Solutions',
      email: 'info@techpro.it',
      phone: '+39 06 7654321',
      address: 'Corso Vittorio Emanuele 100',
      city: 'Roma',
      country: 'Italy',
      vatNumber: 'IT98765432109',
      active: true,
    });

    // Seed some initial items
    this.createItem({
      itemCode: 'ITEM001',
      description: 'Laptop Dell XPS 15',
      category: 'Electronics',
      unitPrice: 1200.0,
      cost: 900.0,
      unitOfMeasure: 'PCS',
      active: true,
    });

    this.createItem({
      itemCode: 'ITEM002',
      description: 'Office Chair Premium',
      category: 'Furniture',
      unitPrice: 350.0,
      cost: 200.0,
      unitOfMeasure: 'PCS',
      active: true,
    });

    this.createItem({
      itemCode: 'ITEM003',
      description: 'Wireless Mouse Logitech',
      category: 'Electronics',
      unitPrice: 45.0,
      cost: 25.0,
      unitOfMeasure: 'PCS',
      active: true,
    });

    // Seed initial stock
    this.updateStock('ITEM001', 'WH01', 50, 'in', 'Initial stock');
    this.updateStock('ITEM002', 'WH01', 120, 'in', 'Initial stock');
    this.updateStock('ITEM003', 'WH01', 300, 'in', 'Initial stock');
    this.updateStock('ITEM001', 'WH02', 30, 'in', 'Initial stock');
    this.updateStock('ITEM003', 'WH02', 150, 'in', 'Initial stock');
  }

  reset() {
    this.customers.clear();
    this.items.clear();
    this.salesOrders.clear();
    this.stock.clear();
    this.orderCounter = 1000;
    this.seedInitialData();
  }

  getStats() {
    return {
      customers: this.customers.size,
      items: this.items.size,
      salesOrders: this.salesOrders.size,
      stockRecords: this.stock.size,
    };
  }
}

// Export singleton instance
export const mockDb = new MockDatabase();
