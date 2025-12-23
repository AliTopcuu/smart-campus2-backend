'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Make startDate and endDate nullable
    const tableDescription = await queryInterface.describeTable('Events');
    
    if (tableDescription.startDate) {
      // Copy data from date to startDate if startDate is null
      await queryInterface.sequelize.query(`
        UPDATE "Events" 
        SET "startDate" = "date" 
        WHERE "startDate" IS NULL AND "date" IS NOT NULL;
      `);
      
      // Make startDate nullable
      await queryInterface.sequelize.query(`
        ALTER TABLE "Events" ALTER COLUMN "startDate" DROP NOT NULL;
      `);
    }
    
    if (tableDescription.endDate) {
      // Make endDate nullable
      await queryInterface.sequelize.query(`
        ALTER TABLE "Events" ALTER COLUMN "endDate" DROP NOT NULL;
      `);
    }
  },

  async down(queryInterface, Sequelize) {
    // Revert if needed
    const tableDescription = await queryInterface.describeTable('Events');
    
    if (tableDescription.startDate) {
      await queryInterface.sequelize.query(`
        ALTER TABLE "Events" ALTER COLUMN "startDate" SET NOT NULL;
      `);
    }
    
    if (tableDescription.endDate) {
      await queryInterface.sequelize.query(`
        ALTER TABLE "Events" ALTER COLUMN "endDate" SET NOT NULL;
      `);
    }
  }
};

