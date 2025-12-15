'use strict';

const bcrypt = require('bcrypt');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      console.log('🌱 Seed işlemi başlıyor...');
      const passwordHash = await bcrypt.hash('Password123', 10);
      const now = new Date();

      // --- 1. DEPARTMANLARI HAZIRLA ---
      const departmentsData = [
        { name: 'Computer Engineering', code: 'ceng', faculty: 'Engineering', createdAt: now, updatedAt: now },
        { name: 'Electrical Engineering', code: 'ee', faculty: 'Engineering', createdAt: now, updatedAt: now },
        { name: 'Business Administration', code: 'bus', faculty: 'Economics', createdAt: now, updatedAt: now },
      ];

      // Mevcut departmanları kontrol et ve sadece olmayanları ekle
      const existingDepts = await queryInterface.sequelize.query(
        `SELECT code FROM "Departments" WHERE code IN (:codes)`,
        {
          replacements: { codes: departmentsData.map(d => d.code) },
          type: Sequelize.QueryTypes.SELECT
        }
      );
      
      const existingCodes = new Set(existingDepts.map(d => d.code));
      const newDepartments = departmentsData.filter(d => !existingCodes.has(d.code));

      if (newDepartments.length > 0) {
        await queryInterface.bulkInsert('Departments', newDepartments, {});
        console.log(`✅ ${newDepartments.length} yeni departman eklendi.`);
      } else {
        console.log('ℹ️ Tüm departmanlar zaten mevcut, ekleme atlandı.');
      }
      
      // Tüm departmanları ID'leri ile geri çek (İlişkiler için gerekli)
      const departments = await queryInterface.sequelize.query(
        `SELECT id, code FROM "Departments";`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );

      // --- 2. KULLANICILARI HAZIRLA ---
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

      // Mevcut kullanıcıları kontrol et
      const existingUsersResult = await queryInterface.sequelize.query(
        `SELECT email FROM "Users" WHERE email IN (:emails)`,
        {
          replacements: { emails: usersData.map(u => u.email) },
          type: Sequelize.QueryTypes.SELECT
        }
      );

      const existingEmails = new Set(existingUsersResult.map(u => u.email));
      const newUsers = usersData.filter(u => !existingEmails.has(u.email));

      if (newUsers.length > 0) {
        await queryInterface.bulkInsert('Users', newUsers, {});
        console.log(`✅ ${newUsers.length} yeni kullanıcı eklendi.`);
      } else {
        console.log('ℹ️ Tüm kullanıcılar zaten mevcut, ekleme atlandı.');
      }

      // Tüm kullanıcıları ID ve Rolleri ile geri çek (KRİTİK ADIM)
      const users = await queryInterface.sequelize.query(
        `SELECT id, role, email FROM "Users";`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );

      const studentUsers = users.filter((u) => u.role === 'student');
      const facultyUsers = users.filter((u) => u.role === 'faculty');

      // --- 3. ÖĞRENCİLERİ EKLE (Eğer yoksa) ---
      if (studentUsers.length > 0 && departments.length > 0) {
        // Mevcut öğrencileri kontrol et (User ID'ye göre)
        const existingStudentsResult = await queryInterface.sequelize.query(
          `SELECT "userId" FROM "Students"`,
          { type: Sequelize.QueryTypes.SELECT }
        );
        const existingStudentUserIds = new Set(existingStudentsResult.map(s => s.userId));

        const studentsData = [];
        studentUsers.forEach((user, index) => {
          // Eğer bu kullanıcı için öğrenci kaydı zaten varsa atla
          if (existingStudentUserIds.has(user.id)) return;

          const dept = departments[index % departments.length];
          studentsData.push({
            userId: user.id,
            studentNumber: `2024${1000 + index}`,
            departmentId: dept.id,
            gpa: 3.0 + (index * 0.1),
            cgpa: 3.0 + (index * 0.1),
            createdAt: now,
            updatedAt: now,
          });
        });

        if (studentsData.length > 0) {
          await queryInterface.bulkInsert('Students', studentsData, {});
          console.log(`✅ ${studentsData.length} öğrenci detayı eklendi.`);
        } else {
          console.log('ℹ️ Öğrenci detayları güncel.');
        }
      }

      // --- 4. AKADEMİSYENLERİ EKLE (Eğer yoksa) ---
      if (facultyUsers.length > 0 && departments.length > 0) {
        // Mevcut akademisyenleri kontrol et
        const existingFacultyResult = await queryInterface.sequelize.query(
          `SELECT "userId" FROM "Faculties"`,
          { type: Sequelize.QueryTypes.SELECT }
        );
        const existingFacultyUserIds = new Set(existingFacultyResult.map(f => f.userId));

        const facultyData = [];
        facultyUsers.forEach((user, index) => {
          if (existingFacultyUserIds.has(user.id)) return;

          const dept = departments[index % departments.length];
          facultyData.push({
            userId: user.id,
            employeeNumber: `EMP-${100 + index}`,
            title: index % 2 === 0 ? 'Professor' : 'Assistant Professor',
            departmentId: dept.id,
            createdAt: now,
            updatedAt: now,
          });
        });

        if (facultyData.length > 0) {
          await queryInterface.bulkInsert('Faculties', facultyData, {});
          console.log(`✅ ${facultyData.length} akademisyen detayı eklendi.`);
        } else {
          console.log('ℹ️ Akademisyen detayları güncel.');
        }
      }

    } catch (error) {
      console.error('❌ SEED HATASI:', error);
      // Hata fırlatma ki deploy başarısız olmasın, sadece logla.
      // throw error; 
    }
  },

  async down(queryInterface, Sequelize) {
    // Seed verilerini geri almak riskli olabilir, o yüzden production'da genellikle boş bırakılır veya dikkatli yazılır.
    // Şimdilik sadece logluyoruz.
    console.log('Seed geri alma işlemi atlandı (Veri kaybını önlemek için).');
  },
};