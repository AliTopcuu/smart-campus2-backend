// Dosya yolu: backend/src/db.js

const { Pool } = require('pg');

const pool = new Pool({
  user: 'ranad',         // Kullanıcı adın
  host: 'localhost',
  database: 'campus.db', // Hedef veritabanı
  password: 'ranad',          // Şifren (yoksa boş bırak)
  port: 5432,
});

pool.connect()
  .then(() => console.log('✅ Veritabanına başarıyla bağlandı: campus.db'))
  .catch(err => console.error('❌ Bağlantı hatası:', err.message));

module.exports = pool;