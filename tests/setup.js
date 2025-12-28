require('dotenv').config({ path: '.env.test' });

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://ranad:ranad@localhost:5432/campus_test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

const db = require('../src/models');

// Test öncesi veritabanı bağlantısı
beforeAll(async () => {
  try {
    await db.sequelize.authenticate();
  } catch (error) {
    console.error('Test DB connection failed:', error);
  }
});

afterAll(async () => {
  await db.sequelize.close();
});

// Her test sonrası veritabanını temizle
afterEach(async () => {
  try {
    // Explicit cleanup order to avoid FK constraints and Deadlocks
    // Delete child tables first
    const cleanups = [
      db.AttendanceRecord,
      db.Enrollment,
      db.Waitlist,
      db.EventRegistration,
      db.EventSurvey,
      db.Grade,
      db.ExcuseRequest,
      db.MealReservation,
      db.WalletTransaction,
      db.Notification,

      // Middle tables
      db.AttendanceSession,
      db.CourseSection,
      db.CoursePrerequisite,
      db.Student,
      db.Faculty,
      db.Event,
      db.MealMenu,
      db.ClassroomReservation,
      db.Wallet,

      // Parent tables
      db.Course,
      db.User,
      // db.Department, // Keep Department
      // db.Classroom, // Keep Classroom
      // db.Cafeteria, // Keep Cafeteria
    ];

    for (const model of cleanups) {
      if (model && model.destroy) {
        try {
          await model.destroy({ where: {}, force: true });
        } catch (e) {
          console.warn(`Cleanup failed for ${model.name}:`, e.message);
        }
      }
    }
  } catch (error) {
    console.error('Cleanup error:', error.message);
  }
});
