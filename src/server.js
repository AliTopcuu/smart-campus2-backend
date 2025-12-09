require('dotenv').config();
const app = require('./app');
const db = require('./models');

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await db.sequelize.authenticate();
    await db.sequelize.sync();
    console.log('✅ Veritabanı bağlantısı BAŞARILI');

    app.listen(PORT, () => {
      console.log(`🚀 Backend API çalışıyor: http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Sunucu başlatılamadı:', err.message);
    process.exit(1);
  }
};

start();