require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Routers
const apiRouter = require('./routes');

// Middlewares
const { notFound } = require('./middlewares/notFound');
const { errorHandler } = require('./middlewares/errorHandler');

const app = express();

// CORS + JSON + Static
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Serve static assets (keep current project root so scanner-interface.html continues to work)
app.use(express.static(path.join(__dirname, '..')));

// Health first (fast path)
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// API routes
app.use('/api', apiRouter);

// Web UI route (scanner)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'scanner-interface.html'));
});

// 404 and error handlers
app.use(notFound);
app.use(errorHandler);

module.exports = app;
