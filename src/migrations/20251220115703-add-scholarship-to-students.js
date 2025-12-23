'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Check if column already exists
    const tableDescription = await queryInterface.describeTable('Students');
    if (!tableDescription.hasScholarship) {
      await queryInterface.addColumn('Students', 'hasScholarship', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Burslu öğrenci mi?'
      });
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Students', 'hasScholarship');
  }
};
