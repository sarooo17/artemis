# Mock Fluentis ERP API Server

🤖 OpenAI-powered mock server that simulates Fluentis ERP API responses with realistic data.

## Features

✅ **Complete API Coverage**
- Import operations (create/update data)
- Export operations (retrieve data)
- Service operations (read-only queries)
- Operation workflows (complex tasks)

✅ **AI-Powered Responses**
- Uses OpenAI GPT-4o-mini for realistic ERP responses
- Context-aware data generation
- Consistent with Fluentis API format

✅ **In-Memory Database**
- Customers, Items, Sales Orders, Stock records
- Seeded with initial test data
- Maintains data consistency across calls

✅ **Realistic Simulation**
- Configurable network latency (200-500ms)
- Random error injection (3% by default)
- Basic Authentication
- Request logging

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

Copy `.env` and set your OpenAI API key (already configured).

### 3. Start Server

```bash
pnpm dev
```

Server starts on `http://localhost:3002`

## API Endpoints

### Health Check
```bash
GET /health
```

### Import Operations (Write)

#### Create Sales Order
```bash
POST /api/import/ImportSalesOrder
Authorization: Basic bW9jay11c2VyOm1vY2stcGFzc3dvcmQ=
Content-Type: application/json

{
  "CompanyId": 1,
  "DepartmentId": 1,
  "customerId": "CUST001",
  "customerName": "Acme Corporation",
  "orderDate": "2024-12-02",
  "deliveryDate": "2024-12-10",
  "notes": "Urgent order",
  "items": [
    {
      "itemCode": "ITEM001",
      "quantity": 5,
      "unitPrice": 1200.00,
      "discount": 10
    }
  ]
}
```

#### Create/Update Customer
```bash
POST /api/import/ImportCustomer
{
  "CompanyId": 1,
  "DepartmentId": 1,
  "customerId": "CUST003",
  "companyName": "New Customer SRL",
  "email": "info@newcustomer.it",
  "phone": "+39 02 1234567",
  "address": "Via Roma 10",
  "city": "Milano",
  "country": "Italy",
  "vatNumber": "IT12345678901"
}
```

#### Create/Update Item
```bash
POST /api/import/ImportItem
{
  "CompanyId": 1,
  "DepartmentId": 1,
  "itemCode": "ITEM004",
  "description": "New Product XYZ",
  "category": "Electronics",
  "unitPrice": 99.99,
  "cost": 60.00,
  "unitOfMeasure": "PCS"
}
```

### Export Operations (Read)

#### Export Customers
```bash
POST /api/export/ExportCustomers
{
  "CompanyId": 1,
  "DepartmentId": 1
}
```

#### Export Stock Summary
```bash
POST /api/export/ExportStockSummary
{
  "CompanyId": 1,
  "DepartmentId": 1,
  "itemCode": "ITEM001"
}
```

### Service Operations (Read-Only)

#### Get Stock Summary
```bash
POST /api/service/GetStockSummary
{
  "CompanyId": 1,
  "DepartmentId": 1,
  "itemCode": "ITEM001"
}
```

#### Validate Sales Order
```bash
POST /api/service/ValidateSalesOrder
{
  "CompanyId": 1,
  "DepartmentId": 1,
  "customerId": "CUST001",
  "items": [
    {
      "itemCode": "ITEM001",
      "quantity": 5
    }
  ]
}
```

### Operation (Complex)

#### Update Stock
```bash
POST /api/operation/UpdateStock
{
  "CompanyId": 1,
  "DepartmentId": 1,
  "itemCode": "ITEM001",
  "warehouseCode": "WH01",
  "quantity": 10,
  "movementType": "in",
  "reason": "Purchase receipt",
  "referenceDocument": "PO-2024-001"
}
```

## Authentication

Basic Authentication with credentials:
- Username: `mock-user`
- Password: `mock-password`

Base64 encoded: `bW9jay11c2VyOm1vY2stcGFzc3dvcmQ=`

## Initial Data

The server is seeded with:
- 2 customers (CUST001, CUST002)
- 3 items (ITEM001, ITEM002, ITEM003)
- Stock records in 2 warehouses (WH01, WH02)

## Admin Endpoints

### Reset Database
```bash
POST /admin/reset
```

### Get Stats
```bash
GET /admin/stats
```

## Configuration

Environment variables in `.env`:

```env
PORT=3002
OPENAI_API_KEY=your-key-here
MOCK_USERNAME=mock-user
MOCK_PASSWORD=mock-password
SIMULATE_LATENCY=true
MIN_LATENCY_MS=200
MAX_LATENCY_MS=500
ERROR_RATE=0.03
```

## Integration with Artemis

Update `apps/backend/.env`:

```env
FLUENTIS_BASE_URL=http://localhost:3002/api
FLUENTIS_USER=mock-user
FLUENTIS_PASSWORD=mock-password
FLUENTIS_COMPANY_CODE=1
FLUENTIS_DEPARTMENT_CODE=1
```

## Architecture

```
Mock Fluentis Server
├── src/
│   ├── index.ts              # Express app
│   ├── state.ts              # In-memory database
│   ├── middleware.ts         # Auth, latency, errors
│   ├── prompts/
│   │   └── index.ts          # OpenAI prompts
│   └── routes/
│       ├── import.routes.ts  # Write operations
│       └── export.routes.ts  # Read operations
```

## Development

```bash
# Watch mode
pnpm dev

# Build
pnpm build

# Start production
pnpm start
```

## Notes

- Responses are AI-generated but use actual database state
- Data persists in-memory during server lifetime
- 3% random error rate simulates real-world failures
- Latency simulation adds 200-500ms to responses
- All timestamps are ISO 8601 format
- Italian VAT (22%) applied to sales orders

## Testing

Use with Postman collection or curl:

```bash
curl -X POST http://localhost:3002/health

curl -X POST http://localhost:3002/api/export/ExportCustomers \
  -H "Authorization: Basic bW9jay11c2VyOm1vY2stcGFzc3dvcmQ=" \
  -H "Content-Type: application/json" \
  -d '{"CompanyId": 1, "DepartmentId": 1}'
```

---

**Built for Artemis Context-Aware Operating System**
