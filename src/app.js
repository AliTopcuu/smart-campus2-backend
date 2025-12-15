require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');

const app = express();

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
    ];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        // Allow localhost with any port
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-retry'],
    exposedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(morgan('dev'));

app.get('/', (_req, res) => {
  res.json({ message: 'Backend API çalışıyor!' });
});

app.use('/api/v1', routes);

// 404
app.use((req, res) => {
  console.warn(`⚠️ 404 - Bulunamadı: ${req.originalUrl}`);
  res.status(404).json({ message: 'Endpoint bulunamadı' });
});

// Hata yakalama
app.use((err, _req, res, _next) => {
  console.error('🔥 Server Error:', err);
  console.error('Error stack:', err.stack);
  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    message: err.message || 'Beklenmeyen bir hata oluştu',
  });
});

module.exports = app;
