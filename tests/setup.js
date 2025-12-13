require('dotenv').config({ path: '.env.test' });

// Test veritabanı için environment variables
process.env.NODE_ENV = 'test';
const testDbUrl = process.env.TEST_DATABASE_URL || 'postgres://ranad:ranad@localhost:5432/campus_test';
process.env.DATABASE_URL = testDbUrl;
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

const { Pool } = require('pg');
const db = require('../src/models');

// Test veritabanını oluştur (eğer yoksa)
const createTestDatabase = async () => {
  try {
    // PostgreSQL connection string'ini parse et
    // Format: postgres://user:password@host:port/database
    const match = testDbUrl.match(/postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (!match) {
      console.warn('⚠️ Veritabanı URL formatı geçersiz, manuel oluşturmayı deneyin');
      return;
    }

    const [, user, password, host, port, dbName] = match;
    
    // postgres veritabanına bağlan (admin veritabanı)
    const adminUrl = `postgres://${user}:${password}@${host}:${port}/postgres`;
    const adminPool = new Pool({ connectionString: adminUrl });
    
    try {
      // Veritabanının var olup olmadığını kontrol et
      const result = await adminPool.query(
        "SELECT 1 FROM pg_database WHERE datname = $1",
        [dbName]
      );

      if (result.rows.length === 0) {
        // Veritabanı yoksa oluştur
        await adminPool.query(`CREATE DATABASE ${dbName}`);
        console.log(`✅ Test veritabanı oluşturuldu: ${dbName}`);
      } else {
        console.log(`ℹ️ Test veritabanı zaten mevcut: ${dbName}`);
      }
    } catch (error) {
      // Veritabanı zaten varsa veya başka bir hata varsa devam et
      if (error.message.includes('already exists')) {
        console.log(`ℹ️ Test veritabanı zaten mevcut: ${dbName}`);
      } else {
        console.warn(`⚠️ Test veritabanı oluşturulamadı: ${error.message}`);
        console.warn(`Lütfen manuel olarak oluşturun: CREATE DATABASE ${dbName};`);
      }
    } finally {
      await adminPool.end();
    }
  } catch (error) {
    console.warn(`⚠️ Test veritabanı kontrolü başarısız: ${error.message}`);
    console.warn('Lütfen manuel olarak oluşturun: CREATE DATABASE campus_test;');
  }
};

// Test öncesi ve sonrası veritabanı işlemleri
beforeAll(async () => {
  // Önce test veritabanını oluştur
  await createTestDatabase();
  
  // Sonra bağlan ve sync yap
  await db.sequelize.authenticate();
  
  // Test veritabanını temizle ve yeniden oluştur
  try {
    await db.sequelize.sync({ force: true });
  } catch (error) {
    // Eğer sync hatası olursa, tabloları manuel drop et ve tekrar dene
    try {
      await db.sequelize.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
      await db.sequelize.sync({ force: true });
    } catch (syncError) {
      console.error('⚠️ Veritabanı sync hatası:', syncError.message);
      throw syncError;
    }
  }
});

afterAll(async () => {
  await db.sequelize.close();
});

// Her test sonrası veritabanını temizle
afterEach(async () => {
  try {
    // Foreign key constraint'ler nedeniyle doğru sırada sil
    // Önce child tabloları (foreign key'leri olan)
    await db.sequelize.query('TRUNCATE TABLE "Students" CASCADE;');
    await db.sequelize.query('TRUNCATE TABLE "Faculties" CASCADE;');
    await db.sequelize.query('TRUNCATE TABLE "Users" CASCADE;');
    // Departments tablosunu silme, çünkü test setup'ının bir parçası
  } catch (error) {
    // Hata olursa sessizce devam et (tablolar zaten temiz olabilir veya henüz oluşturulmamış olabilir)
  }
});

