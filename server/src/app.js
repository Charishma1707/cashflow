import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Routes
import dashboardRoutes from './routes/dashboardRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import businessRoutes from './routes/businessRoutes.js';
import paypalRoutes from './routes/paypalRoutes.js';
import mcpRoutes from './routes/mcpRoutes.js';

dotenv.config();

const app = express();

// CORS configuration
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman) or matching client url
      if (!origin || origin === allowedOrigin || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(null, true); // Dev permissive
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Root API Welcome
app.get('/', (req, res) => {
  res.json({
    app: 'CashFlow Copilot API',
    status: 'online',
    version: '1.0.0',
    documentation: 'https://github.com/Charishma1707/cashflow',
    endpoints: {
      health: '/api/health',
      dashboard: '/api/dashboard',
      invoices: '/api/invoices',
      expenses: '/api/expenses',
      payments: '/api/payments',
      business: '/api/business',
      paypalStatus: '/api/paypal/status',
    },
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'CashFlow Copilot API',
    timestamp: new Date().toISOString(),
  });
});

// Mount modular routes
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/paypal', paypalRoutes);
app.use('/api/mcp', mcpRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

export default app;
