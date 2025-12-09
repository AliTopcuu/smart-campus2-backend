'use strict';

const bcrypt = require('bcrypt');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Tüm işlemi try-catch içine alıyoruz ki hata varsa görelim
    try {
      console.log('>>> MIGRATION BAŞLADI: Veri ekleme işlemi başlatılıyor...');

      const passwordHash = await bcrypt.hash('Password123', 10);
      const now = new Date();

      // 1. DEPARTMENTS EKLEME
      const departments = [
        { name: 'Computer Engineering', code: 'ceng', faculty: 'Engineering', createdAt: now, updatedAt: now },
        { name: 'Electrical Engineering', code: 'ee', faculty: 'Engineering', createdAt: now, updatedAt: now },
        { name: 'Business Administration', code: 'bus', faculty: 'Economics', createdAt: now, updatedAt: now },
      ];

      console.log(`>>> 1. ADIM: Departments tablosuna ${departments.length} kayıt ekleniyor...`);
      await queryInterface.bulkInsert('Departments', departments, {});
      
      // Eklenen departmanları geri çekip kontrol edelim
      const departmentRecords = await queryInterface.sequelize.query('SELECT id, code FROM "Departments"');
      const departmentRows = departmentRecords[0];
      console.log('>>> Departments verileri çekildi. Örnek ID:', departmentRows[0]?.id);

      if (!departmentRows || departmentRows.length === 0) {
        throw new Error('HATA: Departmanlar eklendi ama geri okunamadı!');
      }

      // 2. KULLANICILARI HAZIRLAMA
      const users = [
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

      console.log(`>>> 2. ADIM: Users tablosuna ${users.length} kullanıcı ekleniyor...`);
      
      // NOT: Bazı veritabanlarında (MySQL/SQLite) bulkInsert 'returning' desteklemez.
      // Bu yüzden önce ekleyip sonra SELECT ile çekmek en güvenli yöntemdir.
      await queryInterface.bulkInsert('Users', users, {});
      
      console.log('>>> Kullanıcılar eklendi, şimdi ID\'leri almak için sorgu atılıyor...');
      
      // ID'leri almak için manuel sorgu (En güvenli yöntem)
      const allUsersQuery = await queryInterface.sequelize.query(
        'SELECT id, role, email FROM "Users"'
      );
      // Sequelize versiyonuna göre dönüş [results, metadata] olabilir, bu yüzden [0] alıyoruz
      const insertedUsers = allUsersQuery[0];

      console.log(`>>> Veritabanından dönen kullanıcı sayısı: ${insertedUsers.length}`);
      
      if (insertedUsers.length === 0) {
        throw new Error('HATA: Kullanıcılar eklendi ama SELECT sorgusunda boş döndü!');
      }

      const studentUsers = insertedUsers.filter((user) => user.role === 'student');
      const facultyUsers = insertedUsers.filter((user) => user.role === 'faculty');

      console.log(`>>> Filtrelenen Öğrenci Sayısı: ${studentUsers.length}`);
      console.log(`>>> Filtrelenen Akademisyen Sayısı: ${facultyUsers.length}`);

      // 3. ÖĞRENCİ DETAYLARINI HAZIRLAMA
      const deptId = (index) => {
        // Modulo işleminde hata olmaması için kontrol
        if (departmentRows.length === 0) return null;
        return departmentRows[index % departmentRows.length].id;
      };

      if (studentUsers.length > 0) {
        const students = studentUsers.map((user, index) => ({
          userId: user.id, // Burada ID'nin geldiğinden emin oluyoruz
          studentNumber: `202000${index + 1}`,
          departmentId: deptId(index),
          gpa: 3.0,
          cgpa: 3.1,
          createdAt: now,
          updatedAt: now,
        }));

        console.log('>>> 3. ADIM: Students tablosuna veri ekleniyor...');
        console.log('>>> Örnek Öğrenci Verisi:', JSON.stringify(students[0])); // İlk veriyi logla
        await queryInterface.bulkInsert('Students', students, {});
      } else {
        console.warn('>>> UYARI: Eklenecek öğrenci bulunamadı!');
      }

      // 4. AKADEMİSYEN DETAYLARINI HAZIRLAMA
      if (facultyUsers.length > 0) {
        const faculty = facultyUsers.map((user, index) => ({
          userId: user.id,
          employeeNumber: `EMP-${index + 1}`,
          title: index % 2 === 0 ? 'Professor' : 'Assistant Professor',
          departmentId: deptId(index),
          createdAt: now,
          updatedAt: now,
        }));

        console.log('>>> 4. ADIM: Faculties tablosuna veri ekleniyor...');
        await queryInterface.bulkInsert('Faculties', faculty, {});
      } else {
        console.warn('>>> UYARI: Eklenecek akademisyen bulunamadı!');
      }

      console.log('>>> MIGRATION BAŞARIYLA TAMAMLANDI ✅');

    } catch (error) {
      console.error('!!! MIGRATION SIRASINDA HATA OLUŞTU !!!');
      console.error(error);
      throw error; // Hatayı fırlat ki işlem 'failed' olarak işaretlensin
    }
  },

  async down(queryInterface) {
    try {
      console.log('>>> Geri alma (Rollback) işlemi başladı...');
      await queryInterface.bulkDelete('Faculties', null, {});
      await queryInterface.bulkDelete('Students', null, {});
      await queryInterface.bulkDelete('Users', null, {});
      await queryInterface.bulkDelete('Departments', null, {});
      console.log('>>> Geri alma işlemi tamamlandı.');
    } catch (error) {
      console.error('!!! ROLLBACK HATASI !!!');
      console.error(error);
    }
  },
};