'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // resetToken ve resetExpires kolonlarını ekle
    const tableDescription = await queryInterface.describeTable('Users');
    
    if (!tableDescription.resetToken) {
      await queryInterface.addColumn('Users', 'resetToken', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
    
    if (!tableDescription.resetExpires) {
      await queryInterface.addColumn('Users', 'resetExpires', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Users', 'resetToken');
    await queryInterface.removeColumn('Users', 'resetExpires');
  },
};