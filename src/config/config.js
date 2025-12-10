require('dotenv').config();

const defaultUrl = process.env.DATABASE_URL || 'postgres://ranad:ranad@localhost:5432/campus';

module.exports = {
  development: {
    url: defaultUrl,
    dialect: 'postgres',
    logging: false,
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

