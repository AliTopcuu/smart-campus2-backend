const bcrypt = require('bcrypt');
const { Sequelize } = require('sequelize');
const config = require('./src/config/config.js');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

let sequelize;
if (dbConfig.url) {
    sequelize = new Sequelize(dbConfig.url, {
        dialect: dbConfig.dialect,
        logging: console.log
    });
} else {
    sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
        host: dbConfig.host,
        dialect: dbConfig.dialect,
        logging: console.log
    });
}

const SALT_ROUNDS = 10;

async function createStaffUser() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        const email = 'staff@smartcampus.edu';
        const password = 'Password123';
        const fullName = 'Kantin Görevlisi';
        const role = 'cafeteria_staff';

        const [results] = await sequelize.query(`SELECT id FROM "Users" WHERE email = '${email}'`);

        if (results.length > 0) {
            console.log('Staff user already exists.');
            // Update role just in case
            await sequelize.query(`UPDATE "Users" SET role = '${role}' WHERE email = '${email}'`);
            console.log('Updated existing user role to cafeteria_staff');
            process.exit(0);
        }

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Postgres specific syntax for NOW()
        // Or just use JS date
        const now = new Date().toISOString();

        await sequelize.query(`
      INSERT INTO "Users" ("fullName", "email", "passwordHash", "role", "status", "createdAt", "updatedAt")
      VALUES ('${fullName}', '${email}', '${passwordHash}', '${role}', 'active', '${now}', '${now}')
    `);

        console.log(`Staff user created successfully.\nEmail: ${email}\nPassword: ${password}`);

    } catch (error) {
        console.error('Unable to connect to the database or execute query:', error);
    } finally {
        await sequelize.close();
    }
}

createStaffUser();
