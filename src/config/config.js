require('dotenv').config();

const defaultUrl = process.env.DATABASE_URL || 'postgres://postgres:yourPassword@localhost:5432/campus';

module.exports = {
  development: {
    url: defaultUrl,
    dialect: 'postgres',
    logging: console.log, // Enable SQL logging for debugging
  },
  test: {
    url: defaultUrl,
    dialect: 'postgres',
    logging: false,
  },
  production: {
    url: defaultUrl,
    dialect: 'postgres',
    logging: false,
  },
};

