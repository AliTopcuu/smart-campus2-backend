'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Önce tablonun mevcut yapısını alalım
    const tableDefinition = await queryInterface.describeTable('Users');

    // resetToken sütunu YOKSA ekle
    if (!tableDefinition.resetToken) {
      await queryInterface.addColumn('Users', 'resetToken', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    // resetExpires sütunu YOKSA ekle
    if (!tableDefinition.resetExpires) {
      await queryInterface.addColumn('Users', 'resetExpires', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    // Geri alırken de kontrol edelim (hata almamak için)
    const tableDefinition = await queryInterface.describeTable('Users');

    if (tableDefinition.resetToken) {
      await queryInterface.removeColumn('Users', 'resetToken');
    }
    if (tableDefinition.resetExpires) {
      await queryInterface.removeColumn('Users', 'resetExpires');
    }
  },
};