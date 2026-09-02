import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

const ALLOWED_ORIGINS = [
  'https://asaliswad.com',
  'https://www.asaliswad.com',
  'https://seller.asaliswad.com',
  'https://admin.asaliswad.com',
  'https://api.asaliswad.com',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002'
];

// CORS Configuration for Production Domains
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin '${origin}' is not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes (Supports both /api and /api/v1)
app.use('/api', routes);
app.use('/api/v1', routes);

// Global Error Handler
app.use(errorHandler);

export default app;
