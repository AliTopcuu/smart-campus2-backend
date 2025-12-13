const { Pool } = require('pg');

const testDbUrl = process.env.TEST_DATABASE_URL || 'postgres://ranad:ranad@localhost:5432/campus_test';

// PostgreSQL connection string'ini parse et
const match = testDbUrl.match(/postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
if (!match) {
  console.error('❌ Veritabanı URL formatı geçersiz');
  process.exit(1);
}

const [, user, password, host, port, dbName] = match;

// postgres veritabanına bağlan (admin veritabanı)
const adminUrl = `postgres://${user}:${password}@${host}:${port}/postgres`;
const adminPool = new Pool({ connectionString: adminUrl });

async function createTestDatabase() {
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
    if (error.message.includes('already exists')) {
      console.log(`ℹ️ Test veritabanı zaten mevcut: ${dbName}`);
    } else {
      console.error(`❌ Hata: ${error.message}`);
      process.exit(1);
    }
  } finally {
    await adminPool.end();
  }
}

createTestDatabase();

