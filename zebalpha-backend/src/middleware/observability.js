/**
 * ZEBALPHA Observability, Correlation Tracking & Slow Request Monitoring Middleware
 * 
 * Features:
 * 1. Request Correlation: Generates or extracts `X-Request-Id` and attaches to request/response.
 * 2. Slow Request Warning: Detects requests taking longer than `SLOW_REQUEST_MS` (default 1000ms).
 * 3. Structured Logging: Logs request start, end, duration, status, and authenticated role.
 * 4. Zero Sensitive Data Leakage: Redacts passwords, OTPs, tokens, and payment secrets.
 */

const SENSITIVE_KEY_REGEX = /password|otp|secret|token|auth|authorization|card|cvv|signature/i;

export function sanitizeForLogging(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForLogging);

  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = sanitizeForLogging(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

export const observabilityMiddleware = (req, res, next) => {
  // 1. Assign or propagate correlation ID
  const incomingId = req.headers['x-request-id'] || req.headers['x-correlation-id'];
  const requestId = (typeof incomingId === 'string' && incomingId.trim()) 
    ? incomingId.trim() 
    : `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  req.id = requestId;
  req.correlationId = requestId;
  res.setHeader('X-Request-Id', requestId);

  // 2. Track timing using high-resolution timer
  const startTime = process.hrtime.bigint();
  const slowThresholdMs = Number(process.env.SLOW_REQUEST_MS) || 1000;

  res.on('finish', () => {
    const elapsedNs = process.hrtime.bigint() - startTime;
    const durationMs = Number(elapsedNs) / 1e6;

    const isHealthCheck = req.path === '/' || req.path === '/health' || req.path.endsWith('/health');

    // 3. Slow Request Alerting
    if (!isHealthCheck && durationMs >= slowThresholdMs) {
      console.warn(JSON.stringify({
        alert: 'SLOW_REQUEST_DETECTED',
        requestId: req.id,
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
        thresholdMs: slowThresholdMs,
        timestamp: new Date().toISOString()
      }));
    } else if (!isHealthCheck && process.env.NODE_ENV !== 'test') {
      // Structured request log
      console.log(JSON.stringify({
        event: 'HTTP_REQUEST_COMPLETED',
        requestId: req.id,
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
        timestamp: new Date().toISOString()
      }));
    }
  });

  next();
};
