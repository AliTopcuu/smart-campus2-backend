'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Tablo yapısını kontrol et
    const tableDefinition = await queryInterface.describeTable('Users');

    // phone sütunu YOKSA ekle
    if (!tableDefinition.phone) {
      await queryInterface.addColumn('Users', 'phone', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    // profilePictureUrl sütunu YOKSA ekle
    if (!tableDefinition.profilePictureUrl) {
      await queryInterface.addColumn('Users', 'profilePictureUrl', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const tableDefinition = await queryInterface.describeTable('Users');

    if (tableDefinition.profilePictureUrl) {
      await queryInterface.removeColumn('Users', 'profilePictureUrl');
    }
    if (tableDefinition.phone) {
      await queryInterface.removeColumn('Users', 'phone');
    }
  },
};