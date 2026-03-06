require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const workflowRoutes = require('./routes/workflow.routes');
const nodeRoutes = require('./routes/node.routes');
const edgeRoutes = require('./routes/edge.routes');
const leadRoutes = require('./routes/lead.routes');
const outboxRoutes = require('./routes/outbox.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/workflows', nodeRoutes);
app.use('/api/workflows', edgeRoutes);
app.use('/api/workflows', leadRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/outbox', outboxRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Test route for debugging
app.get('/api/test-routes', (req, res) => {
  res.json({ 
    message: 'Server is running',
    availableRoutes: [
      'POST /api/workflows/:workflowId/leads/upload-file',
      'POST /api/workflows/:workflowId/leads/import',
      'GET /api/workflows/:workflowId/leads'
    ]
  });
});

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 404 handler
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[Error]', err.message, err.stack);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
