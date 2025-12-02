/**
 * Middleware for Mock Fluentis Server
 */
import { Request, Response, NextFunction } from 'express';

/**
 * Basic Authentication Middleware
 */
export function basicAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.status(401).json({
      success: false,
      error: 'Missing or invalid Authorization header',
      message: 'Basic Authentication required',
    });
    return;
  }

  try {
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    const validUsername = process.env.MOCK_USERNAME || 'mock-user';
    const validPassword = process.env.MOCK_PASSWORD || 'mock-password';

    if (username !== validUsername || password !== validPassword) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Authentication failed',
      });
      return;
    }

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid Authorization header format',
      message: 'Could not parse credentials',
    });
    return;
  }
}

/**
 * Simulate Network Latency
 */
export function simulateLatency(req: Request, res: Response, next: NextFunction): void {
  const shouldSimulate = process.env.SIMULATE_LATENCY === 'true';

  if (!shouldSimulate) {
    return next();
  }

  const minLatency = parseInt(process.env.MIN_LATENCY_MS || '200', 10);
  const maxLatency = parseInt(process.env.MAX_LATENCY_MS || '500', 10);
  const latency = Math.floor(Math.random() * (maxLatency - minLatency + 1)) + minLatency;

  setTimeout(next, latency);
}

/**
 * Simulate Random Errors (for testing error handling)
 */
export function simulateErrors(req: Request, res: Response, next: NextFunction): void {
  const errorRate = parseFloat(process.env.ERROR_RATE || '0.03');

  if (Math.random() < errorRate) {
    const errors = [
      {
        status: 500,
        message: 'Internal server error - Database connection timeout',
        error: 'DB_TIMEOUT',
      },
      {
        status: 503,
        message: 'Service temporarily unavailable',
        error: 'SERVICE_UNAVAILABLE',
      },
      {
        status: 422,
        message: 'Validation error - Invalid data format',
        error: 'VALIDATION_ERROR',
      },
    ];

    const randomError = errors[Math.floor(Math.random() * errors.length)];

    res.status(randomError.status).json({
      success: false,
      error: randomError.error,
      message: randomError.message,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
}

/**
 * Request Logger
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`
    );
  });

  next();
}

/**
 * Validate Company/Department Parameters
 * Skip validation for health and admin endpoints
 */
export function validateCompanyDepartment(req: Request, res: Response, next: NextFunction): void {
  // Skip validation for non-API endpoints
  if (!req.path.startsWith('/api') && !req.path.startsWith('/SD') && !req.path.startsWith('/FS')) {
    next();
    return;
  }

  const { CompanyId, CompanyCode, DepartmentId, DepartmentCode } = req.body;

  // At least one company and one department identifier should be present
  const hasCompany = CompanyId || CompanyCode;
  const hasDepartment = DepartmentId || DepartmentCode;

  if (!hasCompany || !hasDepartment) {
    res.status(400).json({
      success: false,
      error: 'MISSING_PARAMETERS',
      message: 'Company and Department identification parameters are required',
      details: {
        requiredParameters: [
          'CompanyId or CompanyCode',
          'DepartmentId or DepartmentCode',
        ],
      },
    });
    return;
  }

  // For mock purposes, we accept any company/department values
  next();
}

/**
 * Error Handler
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('[ERROR]', err);

  res.status(500).json({
    success: false,
    error: 'INTERNAL_ERROR',
    message: err.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
  });
}
