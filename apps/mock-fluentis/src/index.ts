/**
 * Mock Fluentis ERP API Server
 * OpenAI-powered realistic ERP responses
 */

// Load environment variables FIRST - before any other imports
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import {
  basicAuth,
  simulateLatency,
  simulateErrors,
  requestLogger,
  validateCompanyDepartment,
  errorHandler,
} from './middleware';
import importRoutes from './routes/import.routes';
import exportRoutes from './routes/export.routes';
import genericRoutes from './routes/generic.routes';
import { mockDb } from './state';

const app = express();
const PORT = process.env.PORT || 3002;

// ==================== MIDDLEWARE ====================

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(requestLogger);

// ==================== HEALTH CHECK ====================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Mock Fluentis ERP API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: mockDb.getStats(),
  });
});

// ==================== API ROUTES ====================

// Apply auth and simulation middleware to all API routes
app.use('/api', basicAuth);
app.use('/api', validateCompanyDepartment);
app.use('/api', simulateLatency);
app.use('/api', simulateErrors);

// Import routes (write operations)
app.use('/api/import', importRoutes);

// Export routes (read operations)
app.use('/api/export', exportRoutes);

// Service routes (read-only tasks) - reuse export router
app.use('/api/service', exportRoutes);

// Operation routes (complex tasks) - reuse import router
app.use('/api/operation', importRoutes);

// ==================== FLUENTIS-STYLE ROUTES ====================
// Support real Fluentis API paths for compatibility

// Sales Orders - /SD/SalesOrder/*
app.use('/SD/SalesOrder', exportRoutes);
app.use('/SD/SalesOrder', importRoutes);

// Items - /FS/Item/*
app.use('/FS/Item', exportRoutes);
app.use('/FS/Item', importRoutes);

// Customers - /FS/Contact/*
app.use('/FS/Contact', exportRoutes);
app.use('/FS/Contact', importRoutes);

// Stock/Warehouse - /FS/ItemStock/* and /FS/WarehousePosting/*
app.use('/FS/ItemStock', exportRoutes);
app.use('/FS/WarehousePosting', importRoutes);

// Warehouse Management - /WM/Common/*
app.use('/WM/Common', exportRoutes);

// ==================== CATCH-ALL GENERIC ROUTES ====================
// Handle all other Fluentis endpoints dynamically with OpenAI
// This covers all endpoints from https://docs.fluentis.com/Integration/docs/webApi/endpoints

// Shared Area (SH)
app.use('/SH/Common', genericRoutes);

// Financial Area (FI)
app.use('/FI/GeneralLedger', genericRoutes);

// Manufacturing Execution System (Mes)
app.use('/Mes/ProductionOrders', genericRoutes);

// Manufacturing Scheduling (MS)
app.use('/MS/ProductionCycles', genericRoutes);
app.use('/MS/ProductionJobOrders', genericRoutes);
app.use('/MS/ResourcesRequirements', genericRoutes);

// Project Management (PM)
app.use('/PM/Projects', genericRoutes);
app.use('/PM/WorkReports', genericRoutes);

// Risk Management (PR)
app.use('/PR/RiskManagement', genericRoutes);

// Supply Chain Management - Purchases (Scm)
app.use('/Scm/Nirs', genericRoutes);
app.use('/Scm/PurchaseDeliveryNotes', genericRoutes);
app.use('/Scm/PurchaseDemands', genericRoutes);
app.use('/Scm/PurchaseInvoices', genericRoutes);
app.use('/Scm/PurchaseOffersRequests', genericRoutes);
app.use('/Scm/PurchaseOrders', genericRoutes);
app.use('/Scm/PurchasePriceLists', genericRoutes);

// Supply Chain - Subcontracting (Scs)
app.use('/Scs/SubcontractorPriceLists', genericRoutes);
app.use('/Scs/SubcontractorReturns', genericRoutes);
app.use('/Scs/SubcontractorOrders', genericRoutes);
app.use('/Scs/SubcontractorDeliveryNotes', genericRoutes);

// Sales Distribution (SD) - Additional routes beyond SalesOrder
app.use('/SD/SalesDeliveryNotes', genericRoutes);
app.use('/SD/SalesInvoices', genericRoutes);
app.use('/SD/SalesPriceLists', genericRoutes);
app.use('/SD/SalesOffers', genericRoutes);
app.use('/SD/Pos', genericRoutes);

// Warehouse Management (WM) - Additional routes
app.use('/WM/WarehouseManagement', genericRoutes);
app.use('/WM/Pickings', genericRoutes);

// Quality (QY)
app.use('/QY/CalibrationInstruments', genericRoutes);
app.use('/QY/ControlPlan', genericRoutes);
app.use('/QY/CorrectiveAction', genericRoutes);
app.use('/QY/DataSheet', genericRoutes);
app.use('/QY/ItemControl', genericRoutes);
app.use('/QY/MeasurementTools', genericRoutes);

// CRM Area
app.use('/Crm/SH/Common', genericRoutes);

// ==================== ADMIN ROUTES ====================

// Reset database (for testing)
app.post('/admin/reset', (req, res) => {
  mockDb.reset();
  res.json({
    success: true,
    message: 'Database reset successfully',
    stats: mockDb.getStats(),
  });
});

// Get database stats
app.get('/admin/stats', (req, res) => {
  res.json({
    success: true,
    stats: mockDb.getStats(),
    timestamp: new Date().toISOString(),
  });
});

// ==================== ERROR HANDLING ====================

app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `Endpoint ${req.method} ${req.path} not found`,
    availableEndpoints: {
      import: [
        'POST /api/import/ImportSalesOrder',
        'POST /api/import/ImportCustomer',
        'POST /api/import/ImportItem',
      ],
      export: [
        'POST /api/export/ExportCustomers',
        'POST /api/export/ExportItems',
        'POST /api/export/ExportSalesOrders',
        'POST /api/export/ExportStockSummary',
      ],
      service: [
        'POST /api/service/GetStockSummary',
        'POST /api/service/ValidateSalesOrder',
      ],
      operation: [
        'POST /api/operation/UpdateStock',
      ],
    },
  });
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀  Mock Fluentis ERP API Server                       ║
║                                                           ║
║   Status:    Running                                      ║
║   Port:      ${PORT}                                          ║
║   Base URL:  http://localhost:${PORT}                        ║
║   Health:    http://localhost:${PORT}/health                 ║
║                                                           ║
║   📊  Database Stats:                                     ║
║   ${JSON.stringify(mockDb.getStats(), null, 2).split('\n').join('\n║   ')}
║                                                           ║
║   🔐  Auth:      Basic (${process.env.MOCK_USERNAME || 'mock-user'})             ║
║   🤖  AI Model:  gpt-4o-mini                              ║
║   ⏱️   Latency:   ${process.env.SIMULATE_LATENCY === 'true' ? process.env.MIN_LATENCY_MS + '-' + process.env.MAX_LATENCY_MS + 'ms' : 'disabled'}                      ║
║   💥  Error Rate: ${(parseFloat(process.env.ERROR_RATE || '0.03') * 100).toFixed(1)}%                                 ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;
