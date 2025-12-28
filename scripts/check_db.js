const { Sequelize } = require('sequelize');
require('dotenv').config({ path: '.env.test' });

const dbUrl = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL || 'postgres://ranad:ranad@localhost:5432/campus_test';
console.log('Connecting to:', dbUrl);

const sequelize = new Sequelize(dbUrl, {
    logging: false,
});

async function checkConstraints() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB.');

        const [results] = await sequelize.query(`
      SELECT con.conname, con.contype, con.conkey, pg_get_constraintdef(con.oid)
      FROM pg_catalog.pg_constraint con
      INNER JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
      INNER JOIN pg_catalog.pg_namespace nsp ON nsp.oid = connamespace
      WHERE nsp.nspname = 'public' AND rel.relname = 'Users';
    `);

        console.log('Constraints on Users table:');
        results.forEach(r => console.log(JSON.stringify(r, null, 2)));

        // Check Enrollments FK
        const [enrollResults] = await sequelize.query(`
        SELECT con.conname, con.contype, pg_get_constraintdef(con.oid)
        FROM pg_catalog.pg_constraint con
        INNER JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'Enrollments';
    `);
        console.log('Constraints on Enrollments table:');
        enrollResults.forEach(r => console.log(JSON.stringify(r, null, 2)));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sequelize.close();
    }
}

checkConstraints();
