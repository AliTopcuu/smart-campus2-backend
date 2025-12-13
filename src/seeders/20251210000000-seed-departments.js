'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First, fix any null departmentId in Students table by setting to first available department
    // This prevents constraint violations
    const firstDeptResult = await queryInterface.sequelize.query(
      `SELECT id FROM "Departments" ORDER BY id LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    if (firstDeptResult && firstDeptResult.length > 0 && firstDeptResult[0]) {
      const firstDeptId = firstDeptResult[0].id;
      await queryInterface.sequelize.query(
        `UPDATE "Students" SET "departmentId" = :deptId WHERE "departmentId" IS NULL`,
        {
          replacements: { deptId: firstDeptId },
          type: Sequelize.QueryTypes.UPDATE
        }
      );
    }
    
    const departments = [
      {
        name: 'Bilgisayar Mühendisliği',
        code: 'bilgisayar-muhendisligi',
        faculty: 'Mühendislik Fakültesi'
      },
      {
        name: 'Elektrik-Elektronik Mühendisliği',
        code: 'elektrik-elektronik-muhendisligi',
        faculty: 'Mühendislik Fakültesi'
      },
      {
        name: 'Endüstri Mühendisliği',
        code: 'endustri-muhendisligi',
        faculty: 'Mühendislik Fakültesi'
      },
      {
        name: 'İşletme',
        code: 'isletme',
        faculty: 'İşletme Fakültesi'
      },
      {
        name: 'İktisat',
        code: 'iktisat',
        faculty: 'İktisadi ve İdari Bilimler Fakültesi'
      }
    ];
    
    // Map old codes to new Turkish codes for name-based matching
    const nameToCodeMapping = {
      'bilgisayar': 'bilgisayar-muhendisligi',
      'elektrik': 'elektrik-elektronik-muhendisligi',
      'elektronik': 'elektrik-elektronik-muhendisligi',
      'endüstri': 'endustri-muhendisligi',
      'endustri': 'endustri-muhendisligi',
      'işletme': 'isletme',
      'isletme': 'isletme',
      'iktisat': 'iktisat'
    };
    
    // Upsert each department (update if exists by code OR by name, insert if not)
    for (const dept of departments) {
      // First check if department exists by new code
      const existingByCodeResult = await queryInterface.sequelize.query(
        `SELECT id FROM "Departments" WHERE code = :code LIMIT 1`,
        {
          replacements: { code: dept.code },
          type: Sequelize.QueryTypes.SELECT
        }
      );
      
      let existing = Array.isArray(existingByCodeResult) ? existingByCodeResult[0] : existingByCodeResult;
      
      // If not found by code, try to find by name (for migrating old departments)
      if (!existing || !existing.id) {
        const existingByNameResult = await queryInterface.sequelize.query(
          `SELECT id, code FROM "Departments" WHERE LOWER(name) LIKE :namePattern LIMIT 1`,
          {
            replacements: { namePattern: `%${dept.name.toLowerCase().split(' ')[0]}%` },
            type: Sequelize.QueryTypes.SELECT
          }
        );
        
        existing = Array.isArray(existingByNameResult) ? existingByNameResult[0] : existingByNameResult;
      }
      
      if (existing && existing.id) {
        // Update existing - update code, name, and faculty
        await queryInterface.sequelize.query(
          `UPDATE "Departments" 
           SET name = :name, code = :code, faculty = :faculty, "updatedAt" = NOW()
           WHERE id = :id`,
          {
            replacements: { 
              id: existing.id,
              name: dept.name, 
              faculty: dept.faculty, 
              code: dept.code 
            },
            type: Sequelize.QueryTypes.UPDATE
          }
        );
      } else {
        // Insert new
        await queryInterface.bulkInsert('Departments', [{
          name: dept.name,
          code: dept.code,
          faculty: dept.faculty,
          createdAt: new Date(),
          updatedAt: new Date()
        }]);
      }
    }
    
    // Map old department codes to new ones (Turkish codes)
    const departmentMapping = {
      'ceng': 'bilgisayar-muhendisligi',
      'ce': 'bilgisayar-muhendisligi',
      'cs': 'bilgisayar-muhendisligi',
      'comp': 'bilgisayar-muhendisligi',
      'computer-engineering': 'bilgisayar-muhendisligi',
      'ee': 'elektrik-elektronik-muhendisligi',
      'elec': 'elektrik-elektronik-muhendisligi',
      'electrical-engineering': 'elektrik-elektronik-muhendisligi',
      'ie': 'endustri-muhendisligi',
      'ind': 'endustri-muhendisligi',
      'industrial-engineering': 'endustri-muhendisligi',
      'bus': 'isletme',
      'biz': 'isletme',
      'business': 'isletme',
      'econ': 'iktisat',
      'eco': 'iktisat',
      'economics': 'iktisat'
    };
    
    // Get all department codes we want to keep
    const codesToKeep = departments.map(d => d.code);
    
    // Find departments that are not in our list
    const departmentsToDeleteResult = await queryInterface.sequelize.query(
      `SELECT id, code FROM "Departments" WHERE code NOT IN (:codes)`,
      {
        replacements: { codes: codesToKeep },
        type: Sequelize.QueryTypes.SELECT
      }
    );
    
    // Normalize result - handle different return formats
    let departmentsToDelete = [];
    if (Array.isArray(departmentsToDeleteResult)) {
      departmentsToDelete = Array.isArray(departmentsToDeleteResult[0]) 
        ? departmentsToDeleteResult[0] 
        : departmentsToDeleteResult;
    }
    
    // Process old departments - migrate references to new departments
    for (const oldDept of departmentsToDelete) {
      if (!oldDept || !oldDept.id) continue;
      
      // Check if this old department can be mapped to a new one
      const newCode = departmentMapping[oldDept.code.toLowerCase()];
      
      if (newCode) {
        // Find the new department ID
        const newDeptResult = await queryInterface.sequelize.query(
          `SELECT id FROM "Departments" WHERE code = :code LIMIT 1`,
          {
            replacements: { code: newCode },
            type: Sequelize.QueryTypes.SELECT
          }
        );
        
        const newDept = Array.isArray(newDeptResult) ? newDeptResult[0] : newDeptResult;
        
        if (newDept && newDept.id) {
          // Migrate Students references
          await queryInterface.sequelize.query(
            `UPDATE "Students" SET "departmentId" = :newDeptId WHERE "departmentId" = :oldDeptId`,
            {
              replacements: { newDeptId: newDept.id, oldDeptId: oldDept.id },
              type: Sequelize.QueryTypes.UPDATE
            }
          );
          
          // Migrate Courses references
          await queryInterface.sequelize.query(
            `UPDATE "Courses" SET "departmentId" = :newDeptId WHERE "departmentId" = :oldDeptId`,
            {
              replacements: { newDeptId: newDept.id, oldDeptId: oldDept.id },
              type: Sequelize.QueryTypes.UPDATE
            }
          );
          
          // Now safe to delete the old department
          await queryInterface.bulkDelete('Departments', { id: oldDept.id }, {});
          console.log(`Migrated and deleted old department: ${oldDept.code} -> ${newCode}`);
        }
      } else {
        // Check if referenced - if not, delete it
        const studentCountResult = await queryInterface.sequelize.query(
          `SELECT COUNT(*) as count FROM "Students" WHERE "departmentId" = :deptId`,
          {
            replacements: { deptId: oldDept.id },
            type: Sequelize.QueryTypes.SELECT
          }
        );
        
        const courseCountResult = await queryInterface.sequelize.query(
          `SELECT COUNT(*) as count FROM "Courses" WHERE "departmentId" = :deptId`,
          {
            replacements: { deptId: oldDept.id },
            type: Sequelize.QueryTypes.SELECT
          }
        );
        
        const studentCount = Array.isArray(studentCountResult) && studentCountResult[0]
          ? (parseInt(studentCountResult[0].count, 10) || 0)
          : 0;
        const courseCount = Array.isArray(courseCountResult) && courseCountResult[0]
          ? (parseInt(courseCountResult[0].count, 10) || 0)
          : 0;
        
        if (studentCount === 0 && courseCount === 0) {
          await queryInterface.bulkDelete('Departments', { id: oldDept.id }, {});
          console.log(`Deleted department: ${oldDept.code}`);
        } else {
          console.log(`Skipping deletion of department ${oldDept.code} (id: ${oldDept.id}) - has ${studentCount + courseCount} references and no mapping`);
        }
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Don't delete in down migration to preserve data
  }
};
