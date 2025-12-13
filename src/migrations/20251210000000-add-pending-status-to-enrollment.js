'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // PostgreSQL'de ENUM tip adını bulalım - kolon bilgisinden
    const [enumResults] = await queryInterface.sequelize.query(`
      SELECT pg_type.typname
      FROM pg_type
      JOIN pg_attribute ON pg_attribute.atttypid = pg_type.oid
      JOIN pg_class ON pg_class.oid = pg_attribute.attrelid
      WHERE pg_class.relname = 'Enrollments'
        AND pg_attribute.attname = 'status'
        AND pg_type.typtype = 'e'
      LIMIT 1
    `);

    let enumTypeName;
    
    if (enumResults && enumResults.length > 0) {
      enumTypeName = enumResults[0].typname;
    } else {
      // Eğer bulamazsak, Sequelize'in kullanabileceği olası formatları deneyelim
      const possibleNames = [
        'enum_Enrollments_status',
        'Enrollments_status_enum',
        '"enum_Enrollments_status"'
      ];
      
      enumTypeName = null;
      for (const name of possibleNames) {
        try {
          const cleanName = name.replace(/"/g, '');
          await queryInterface.sequelize.query(`
            SELECT 1 FROM pg_type WHERE typname = '${cleanName}' LIMIT 1
          `);
          enumTypeName = cleanName;
          break;
        } catch (e) {
          // Continue to next name
        }
      }
      
      if (!enumTypeName) {
        throw new Error('Could not find Enrollment status ENUM type. Please check your database.');
      }
    }

    // ENUM değerlerini ekle
    // PostgreSQL'de IF NOT EXISTS sadece 9.5+ için çalışır, önce kontrol edelim
    const [existingValues] = await queryInterface.sequelize.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = '${enumTypeName.replace(/"/g, '')}')
    `);
    
    const existingLabels = existingValues.map(v => v.enumlabel);
    
    if (!existingLabels.includes('pending')) {
      await queryInterface.sequelize.query(`
        ALTER TYPE "${enumTypeName.replace(/"/g, '')}" ADD VALUE 'pending'
      `);
    }
    
    if (!existingLabels.includes('rejected')) {
      await queryInterface.sequelize.query(`
        ALTER TYPE "${enumTypeName.replace(/"/g, '')}" ADD VALUE 'rejected'
      `);
    }
  },

  async down(queryInterface, Sequelize) {
    // PostgreSQL ENUM'dan değer silmek zor olduğu için, 
    // mevcut pending/rejected kayıtları 'dropped' olarak güncelliyoruz
    await queryInterface.sequelize.query(`
      UPDATE "Enrollments" 
      SET status = 'dropped' 
      WHERE status IN ('pending', 'rejected')
    `);
    
    // Not: PostgreSQL'de ENUM değerlerini kaldırmak için yeni enum oluşturup 
    // kolonu değiştirmek gerekir, bu yüzden down migration tam tersini yapmayacak
  },
};
