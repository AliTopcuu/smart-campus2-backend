require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');
const path = require('path');
const fs = require('fs');

const app = express();

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173'];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(morgan('dev'));

/* -------------------------------
   📌 UPLOADS KLASÖRÜ HATA AYIKLAMA
--------------------------------- */

const UPLOADS_PATH = path.join(__dirname, '../uploads');

console.log('-----------------------------------------');
console.log('🧪 Statik dosya servis yolu ayarlanıyor...');
console.log('📁 __dirname:', __dirname);
console.log('📁 Servis edilen uploads klasörü:', UPLOADS_PATH);

// Klasör var mı kontrol edelim
if (!fs.existsSync(UPLOADS_PATH)) {
  console.error('❌ UPLOADS_PATH bulunamadı! Yol yanlış olabilir.');
} else {
  console.log('✅ UPLOADS_PATH bulundu, statik olarak servis ediliyor.');
}
console.log('-----------------------------------------');

app.use('/uploads', express.static(UPLOADS_PATH));


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
  const status = err.statusCode || 500;
  res.status(status).json({
    message: err.message || 'Beklenmeyen bir hata oluştu',
  });
});

module.exports = app;
