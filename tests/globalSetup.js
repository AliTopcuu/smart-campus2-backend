const { Pool } = require('pg');
require('dotenv').config({ path: '.env.test' });

module.exports = async () => {
    // Test veritabanı için environment variables
    process.env.NODE_ENV = 'test';
    const testDbUrl = process.env.TEST_DATABASE_URL || 'postgres://ranad:ranad@localhost:5432/campus_test';
    process.env.DATABASE_URL = testDbUrl;

    // Require db AFTER setting env vars so config.js picks up the right URL
    const db = require('../src/models');

    // 1. Create Database if not exists
    try {
        const match = testDbUrl.match(/postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
        if (match) {
            const [, user, password, host, port, dbName] = match;
            const adminUrl = `postgres://${user}:${password}@${host}:${port}/postgres`;
            const adminPool = new Pool({ connectionString: adminUrl });

            try {
                const result = await adminPool.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
                if (result.rows.length === 0) {
                    await adminPool.query(`CREATE DATABASE ${dbName}`);
                    console.log(`✅ Test veritabanı oluşturuldu: ${dbName}`);
                }
            } catch (e) {
                // ignore - Postgres DB might not be accessible or other issues
                // We proceed hoping the DB exists or connection string targets an existing one
            } finally {
                await adminPool.end();
            }
        }
    } catch (error) {
        console.warn('DB creation check failed:', error.message);
    }

    // 2. Sync Schema ONCE
    try {
        await db.sequelize.authenticate();
        // Drop all tables and recreate them (fresh schema for the whole test run)
        await db.sequelize.sync({ force: true });
        console.log('✅ Database schema synced successfully.');
        await db.sequelize.close(); // Close connection so tests can start fresh
    } catch (error) {
        console.error('❌ Database sync failed in global setup:', error);
        process.exit(1);
    }
};
