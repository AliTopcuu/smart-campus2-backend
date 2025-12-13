// Sequelize CLI için config dosyası
// Bu dosya sadece migration'lar için kullanılıyor
require('dotenv').config();

const defaultUrl = process.env.DATABASE_URL || 'postgres://postgres:yourPassword@localhost:5432/campus';

module.exports = {
  development: {
    url: defaultUrl,
    dialect: 'postgres',
    logging: false,
  },
  test: {
    url: process.env.TEST_DATABASE_URL || 'postgres://postgres:yourPassword@localhost:5432/campus_test',
    dialect: 'postgres',
    logging: false,
  },
  production: {
    url: process.env.DATABASE_URL || defaultUrl,
    dialect: 'postgres',
    logging: false,
  },
};

