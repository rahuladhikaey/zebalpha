import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// 1. Comprehensive Helmet Security Headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com"],
        connectSrc: [
          "'self'", 
          "https://*.supabase.co", 
          "https://api.razorpay.com", 
          "https://api.cloudinary.com",
          "https://*.pooler.supabase.com"
        ],
        imgSrc: ["'self'", "data:", "blob:", "https:", "https://res.cloudinary.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'", "https:", "data:"],
        frameSrc: ["https://api.razorpay.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    frameguard: { action: 'deny' },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

// 2. Strict CORS Configuration
const ALLOWED_ORIGINS = [
  'https://asaliswad.com',
  'https://www.asaliswad.com',
  'https://seller.asaliswad.com',
  'https://admin.asaliswad.com',
  'https://api.asaliswad.com',
  'https://zebalpha.com',
  'https://www.zebalpha.com',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002'
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like server-to-server or curl) only outside production
      if (!origin && process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy violation: Origin '${origin}' is not permitted.`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-cron-secret'],
    maxAge: 86400, // 24 hours preflight cache
  })
);

// 3. Rate Limiting Protection (DDoS, Credential Stuffing, Brute-Force Prevention)
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Max 500 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP. Please try again after 15 minutes.'
  }
});

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Max 20 authentication attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many login attempts. Please wait 15 minutes before trying again.'
  }
});

const checkoutRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // Max 30 checkout actions per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Checkout request limit exceeded. Please wait a few moments.'
  }
});

// Apply global rate limiter
app.use(globalApiLimiter);

// Apply specific rate limiters on sensitive routes
app.use('/api/auth', authRateLimiter);
app.use('/api/v1/auth', authRateLimiter);
app.use('/api/checkout', checkoutRateLimiter);
app.use('/api/v1/checkout', checkoutRateLimiter);

// 4. Request Body Parsers with strict size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. API Routes (Supports both /api and /api/v1)
app.use('/api', routes);
app.use('/api/v1', routes);

// 6. Global Centralized Error Handler (Prevents stack trace leaks in production)
app.use(errorHandler);

export default app;
