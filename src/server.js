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

      const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Backend API çalışıyor: http://0.0.0.0:${PORT}`);
      });

      // Initialize Socket.io
      const { initSocket } = require('./socket');
      initSocket(server);

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

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  // Don't exit immediately, let the error handler deal with it
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  // Don't exit immediately, let the error handler deal with it
});

start();
// Server updated with meal routes