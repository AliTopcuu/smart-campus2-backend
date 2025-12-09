'use strict';

const bcrypt = require('bcrypt');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      console.log('🌱 Seed işlemi başlıyor...');
      const passwordHash = await bcrypt.hash('Password123', 10);
      const now = new Date();

      // --- 1. DEPARTMANLARI EKLE ---
      const departmentsData = [
        { name: 'Computer Engineering', code: 'ceng', faculty: 'Engineering', createdAt: now, updatedAt: now },
        { name: 'Electrical Engineering', code: 'ee', faculty: 'Engineering', createdAt: now, updatedAt: now },
        { name: 'Business Administration', code: 'bus', faculty: 'Economics', createdAt: now, updatedAt: now },
      ];

      // Önce varsa eski verileri temizle (duplicate hatası almamak için)
      // await queryInterface.bulkDelete('Departments', null, {}); 

      await queryInterface.bulkInsert('Departments', departmentsData, {});
      
      // Eklenen departmanları ID'leri ile geri çek
      const departments = await queryInterface.sequelize.query(
        `SELECT id, code FROM "Departments";`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      
      console.log(`✅ ${departments.length} departman eklendi/bulundu.`);

      // --- 2. KULLANICILARI EKLE ---
      const usersData = [
        {
          fullName: 'Admin User',
          email: 'admin@smartcampus.edu',
          passwordHash,
          role: 'admin',
          status: 'active',
          createdAt: now,
          updatedAt: now,
        },
        ...Array.from({ length: 5 }).map((_, index) => ({
          fullName: `Student ${index + 1}`,
          email: `student${index + 1}@smartcampus.edu`,
          passwordHash,
          role: 'student',
          status: 'active',
          createdAt: now,
          updatedAt: now,
        })),
        ...Array.from({ length: 2 }).map((_, index) => ({
          fullName: `Faculty ${index + 1}`,
          email: `faculty${index + 1}@smartcampus.edu`,
          passwordHash,
          role: 'faculty',
          status: 'active',
          createdAt: now,
          updatedAt: now,
        })),
      ];

      await queryInterface.bulkInsert('Users', usersData, {});

      // Eklenen kullanıcıları ID ve Rolleri ile geri çek (KRİTİK ADIM)
      const users = await queryInterface.sequelize.query(
        `SELECT id, role, email FROM "Users";`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );

      console.log(`✅ ${users.length} kullanıcı eklendi/bulundu.`);

      const studentUsers = users.filter((u) => u.role === 'student');
      const facultyUsers = users.filter((u) => u.role === 'faculty');

      // --- 3. ÖĞRENCİLERİ EKLE ---
      if (studentUsers.length > 0 && departments.length > 0) {
        const studentsData = studentUsers.map((user, index) => {
          // Departman ID'sini sırayla ata
          const dept = departments[index % departments.length];
          return {
            userId: user.id,
            studentNumber: `2024${1000 + index}`,
            departmentId: dept.id,
            gpa: 3.0 + (index * 0.1),
            cgpa: 3.0 + (index * 0.1),
            createdAt: now,
            updatedAt: now,
          };
        });

        await queryInterface.bulkInsert('Students', studentsData, {});
        console.log(`✅ ${studentsData.length} öğrenci detayı eklendi.`);
      }

      // --- 4. AKADEMİSYENLERİ EKLE ---
      if (facultyUsers.length > 0 && departments.length > 0) {
        const facultyData = facultyUsers.map((user, index) => {
          const dept = departments[index % departments.length];
          return {
            userId: user.id,
            employeeNumber: `EMP-${100 + index}`,
            title: index % 2 === 0 ? 'Professor' : 'Assistant Professor',
            departmentId: dept.id,
            createdAt: now,
            updatedAt: now,
          };
        });

        await queryInterface.bulkInsert('Faculties', facultyData, {});
        console.log(`✅ ${facultyData.length} akademisyen detayı eklendi.`);
      }

    } catch (error) {
      console.error('❌ SEED HATASI:', error);
    }
  },

  async down(queryInterface, Sequelize) {
    // Verileri ters sırayla sil (Foreign Key hatası almamak için)
    await queryInterface.bulkDelete('Faculties', null, {});
    await queryInterface.bulkDelete('Students', null, {});
    await queryInterface.bulkDelete('Users', null, {});
    await queryInterface.bulkDelete('Departments', null, {});
  },
};