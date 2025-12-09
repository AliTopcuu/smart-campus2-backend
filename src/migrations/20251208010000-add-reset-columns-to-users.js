'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up() {
    // Bu migrasyonun sütunları zaten veritabanında olduğu için 
    // çalışmaması için içeriğini boş bıraktık.
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Users', 'resetToken');
    await queryInterface.removeColumn('Users', 'resetExpires');
  },
};