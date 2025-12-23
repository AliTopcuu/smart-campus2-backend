'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Make category nullable or set default value
    const tableDescription = await queryInterface.describeTable('Events');
    
    // Check if category column exists and if it's an enum type
    if (tableDescription.category) {
      try {
        // Check if enum type exists
        const [enumCheck] = await queryInterface.sequelize.query(`
          SELECT EXISTS (
            SELECT 1 FROM pg_type WHERE typname = 'enum_Events_category'
          ) as exists;
        `);
        
        if (enumCheck[0] && enumCheck[0].exists) {
          // Enum type exists, proceed with update
          await queryInterface.sequelize.query(`
            DO $$
            DECLARE
              first_enum_value text;
            BEGIN
              SELECT unnest(enum_range(NULL::"enum_Events_category"))::text INTO first_enum_value LIMIT 1;
              UPDATE "Events" 
              SET "category" = first_enum_value::"enum_Events_category" 
              WHERE "category" IS NULL;
            END $$;
          `);
        }
        
        // Make it nullable (works for both enum and string types)
        await queryInterface.sequelize.query(`
          ALTER TABLE "Events" ALTER COLUMN "category" DROP NOT NULL;
        `);
      } catch (error) {
        // If category is not an enum, just make it nullable
        console.log('Category column is not an enum, making it nullable directly');
        await queryInterface.sequelize.query(`
          ALTER TABLE "Events" ALTER COLUMN "category" DROP NOT NULL;
        `);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Revert if needed
    const tableDescription = await queryInterface.describeTable('Events');
    
    if (tableDescription.category) {
      await queryInterface.changeColumn('Events', 'category', {
        type: Sequelize.STRING,
        allowNull: false
      });
    }
  }
};

