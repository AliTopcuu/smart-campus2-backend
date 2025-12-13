const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/models');
const bcrypt = require('bcrypt');
const { User, Student, Faculty, Department } = db;
const { signAccessToken } = require('../../src/utils/jwt');

describe('User Endpoints - Integration Tests', () => {
  let testDepartment;
  let studentUser;
  let adminUser;
  let studentToken;
  let adminToken;

  beforeAll(async () => {
    // Test başlamadan önce department oluştur
    testDepartment = await Department.findOrCreate({
      where: { code: 'cs' },
      defaults: {
        name: 'Computer Science',
        code: 'cs',
        faculty: 'Engineering',
      },
    }).then(([dept]) => dept);
  });

  beforeEach(async () => {
    // Student user oluştur
    const studentPasswordHash = await bcrypt.hash('Password123', 10);
    studentUser = await User.create({
      fullName: 'Student User',
      email: 'student@example.com',
      passwordHash: studentPasswordHash,
      role: 'student',
      status: 'active',
    });

    await Student.create({
      userId: studentUser.id,
      studentNumber: 'S123456',
      departmentId: testDepartment.id,
    });

    studentToken = signAccessToken(studentUser);

    // Admin user oluştur
    const adminPasswordHash = await bcrypt.hash('Password123', 10);
    adminUser = await User.create({
      fullName: 'Admin User',
      email: 'admin@example.com',
      passwordHash: adminPasswordHash,
      role: 'admin',
      status: 'active',
    });

    adminToken = signAccessToken(adminUser);
  });

  // afterEach ve afterAll setup.js'de zaten var

  describe('GET /api/v1/users/me', () => {
    it('should get user profile successfully', async () => {
      const response = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('fullName');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('role');
      expect(response.body.email).toBe('student@example.com');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/v1/users/me');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/v1/users/me', () => {
    it('should update user profile successfully', async () => {
      const response = await request(app)
        .put('/api/v1/users/me')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          fullName: 'Updated Name',
          phone: '+905551234567',
        });

      expect(response.status).toBe(200);
      expect(response.body.fullName).toBe('Updated Name');
      expect(response.body.phone).toBe('+905551234567');

      // Veritabanında güncellendi mi?
      await studentUser.reload();
      expect(studentUser.fullName).toBe('Updated Name');
      expect(studentUser.phone).toBe('+905551234567');
    });

  });

  describe('POST /api/v1/users/me/change-password', () => {
    it('should change password successfully', async () => {
      const response = await request(app)
        .post('/api/v1/users/me/change-password')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          currentPassword: 'Password123',
          newPassword: 'NewPassword123',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password updated successfully');

      // Yeni şifre ile giriş yapılabilir mi?
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'student@example.com',
          password: 'NewPassword123',
        });

      expect(loginResponse.status).toBe(200);
    });

    it('should return 400 for incorrect current password', async () => {
      const response = await request(app)
        .post('/api/v1/users/me/change-password')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          currentPassword: 'WrongPassword',
          newPassword: 'NewPassword123',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/users (Admin)', () => {
    it('should get user list for admin', async () => {
      // Birkaç kullanıcı daha oluştur
      await User.create({
        fullName: 'User 1',
        email: 'user1@example.com',
        passwordHash: await bcrypt.hash('Password123', 10),
        role: 'student',
        status: 'active',
      });

      await User.create({
        fullName: 'User 2',
        email: 'user2@example.com',
        passwordHash: await bcrypt.hash('Password123', 10),
        role: 'faculty',
        status: 'active',
      });

      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          page: 1,
          limit: 10,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta).toHaveProperty('limit');
      expect(response.body.meta).toHaveProperty('total');
    });

    it('should filter users by role', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          role: 'student',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.every((user) => user.role === 'student')).toBe(true);
    });
  });

});

