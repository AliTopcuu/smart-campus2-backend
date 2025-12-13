// Dosya yolu: backend/src/db.js

const { Pool } = require('pg');

// LOCAL: Docker container'ından bağlanıyoruz
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',              // Docker PostgreSQL default user
  host: process.env.DB_HOST || 'localhost',            // Docker container port mapping
  database: process.env.DB_NAME || 'campus',            // Hedef veritabanı
  password: process.env.DB_PASSWORD || 'yourPassword',  // Docker container password
  port: parseInt(process.env.DB_PORT || '5432'),
});

pool.connect()
  .then(() => console.log('✅ Veritabanına başarıyla bağlandı: campus.db'))
  .catch(err => console.error('❌ Bağlantı hatası:', err.message));

module.exports = pool;