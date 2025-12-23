'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add date column if it doesn't exist
    const tableDescription = await queryInterface.describeTable('Events');
    
    if (!tableDescription.date) {
      await queryInterface.addColumn('Events', 'date', {
        type: Sequelize.DATE,
        allowNull: true
      });
      
      // Copy data from startDate to date if startDate exists
      await queryInterface.sequelize.query(`
        UPDATE "Events" 
        SET "date" = "startDate" 
        WHERE "date" IS NULL AND "startDate" IS NOT NULL;
      `);
      
      // Make date NOT NULL after data migration
      await queryInterface.changeColumn('Events', 'date', {
        type: Sequelize.DATE,
        allowNull: false
      });
    }
    
    // Add currentParticipants column if it doesn't exist
    if (!tableDescription.currentParticipants) {
      await queryInterface.addColumn('Events', 'currentParticipants', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      });
      
      // Copy data from registeredCount to currentParticipants if registeredCount exists
      await queryInterface.sequelize.query(`
        UPDATE "Events" 
        SET "currentParticipants" = COALESCE("registeredCount", 0) 
        WHERE "currentParticipants" IS NULL;
      `);
      
      // Make currentParticipants NOT NULL after data migration
      await queryInterface.changeColumn('Events', 'currentParticipants', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      });
    }
    
    // Add version column if it doesn't exist
    if (!tableDescription.version) {
      await queryInterface.addColumn('Events', 'version', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      });
    }
    
    // Add surveySchema column if it doesn't exist
    if (!tableDescription.surveySchema) {
      await queryInterface.addColumn('Events', 'surveySchema', {
        type: Sequelize.JSONB,
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove added columns
    const tableDescription = await queryInterface.describeTable('Events');
    
    if (tableDescription.date) {
      await queryInterface.removeColumn('Events', 'date');
    }
    if (tableDescription.currentParticipants) {
      await queryInterface.removeColumn('Events', 'currentParticipants');
    }
    if (tableDescription.version) {
      await queryInterface.removeColumn('Events', 'version');
    }
    if (tableDescription.surveySchema) {
      await queryInterface.removeColumn('Events', 'surveySchema');
    }
  }
};

