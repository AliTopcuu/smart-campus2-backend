require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');

const app = express();

// 1. İzin verilen kökleri (origins) net bir şekilde tanımlayalım
// Buraya hata veren frontend adresini MANUEL olarak ekledik.
const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'https://smart-campus2-frontend-production.up.railway.app' // <-- EKLENDİ: Senin frontend adresin
];

// .env dosyasından gelenleri de listeye dahil edelim (varsa)
const envOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : [];

const allAllowedOrigins = [...defaultAllowedOrigins, ...envOrigins];

app.use(
  cors({
    origin: function (origin, callback) {
      // Origin header'ı olmayan isteklere (Postman, Mobile App, Server-to-Server) izin ver
      if (!origin) return callback(null, true);

      // 1. Tam eşleşme kontrolü (Listede var mı?)
      if (allAllowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // 2. Railway domainleri için esnek kontrol (Sonu .railway.app ile bitenlere izin ver)
      // 'includes' yerine 'endsWith' daha güvenlidir.
      if (origin.endsWith('.railway.app') || origin.endsWith('.up.railway.app')) {
        return callback(null, true);
      }

      // İzin yoksa sunucu konsoluna log düşelim (Hata ayıklamak için çok önemli)
      console.error(`CORS BLOCKED: Origin '${origin}' is not allowed.`);
      
      // Hata döndür
      return callback(new Error('CORS policy restricted this request'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-retry'],
    exposedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

// Helmet ayarları
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

// 404 Handler
app.use((req, res) => {
  console.warn(`⚠️ 404 - Bulunamadı: ${req.originalUrl}`);
  res.status(404).json({ message: 'Endpoint bulunamadı' });
});

// Global Error Handler
app.use((err, _req, res, _next) => {
  // CORS hatası yakalandığında özel mesaj verelim
  if (err.message === 'CORS policy restricted this request') {
    return res.status(403).json({ message: 'CORS Hatası: Bu domaine izin verilmiyor.' });
  }

  console.error('🔥 Server Error:', err);
  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    message: err.message || 'Beklenmeyen bir hata oluştu',
  });
});

module.exports = app;