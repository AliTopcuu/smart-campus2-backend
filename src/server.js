require('dotenv').config();
const app = require('./app');
const db = require('./models');

const PORT = process.env.PORT || 5000;

const start = async () => {
  const maxRetries = 10;
  const retryDelay = 3000; // 3 seconds

  for (let i = 0; i < maxRetries; i++) {
    try {
      await db.sequelize.authenticate();
      await db.sequelize.sync();
      console.log('✅ Veritabanı bağlantısı BAŞARILI');

      app.listen(PORT, () => {
        console.log(`🚀 Backend API çalışıyor: http://localhost:${PORT}`);
      });
      return; // Success, exit the function
    } catch (err) {
      if (i === maxRetries - 1) {
        console.error('❌ Sunucu başlatılamadı:', err.message);
        process.exit(1);
      }
      console.log(`⏳ Veritabanı bekleniyor... (${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
};

start();