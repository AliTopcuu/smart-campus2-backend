const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/models');
const bcrypt = require('bcrypt');
const { User, Student, Faculty, Department } = db;

describe('Auth Endpoints - Integration Tests', () => {
  let testDepartment;

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

  // afterEach ve afterAll setup.js'de zaten var

  describe('POST /api/v1/auth/register', () => {
    it('should register a new student successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'John Doe',
          email: 'john@example.com',
          password: 'Password123',
          confirmPassword: 'Password123',
          role: 'student',
          studentNumber: 'S123456',
          department: 'Computer Science',
          termsAccepted: true,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('john@example.com');
      expect(response.body.user.role).toBe('student');
    });

    it('should return 400 for duplicate email', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'First User',
          email: 'duplicate@example.com',
          password: 'Password123',
          confirmPassword: 'Password123',
          role: 'student',
          termsAccepted: true,
        });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Second User',
          email: 'duplicate@example.com',
          password: 'Password123',
          confirmPassword: 'Password123',
          role: 'student',
          termsAccepted: true,
        });

      expect(response.status).toBe(400);
    });

    it('should register a faculty user successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Jane Smith',
          email: 'jane@example.com',
          password: 'Password123',
          confirmPassword: 'Password123',
          role: 'faculty',
          department: 'Computer Science',
          termsAccepted: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.user.role).toBe('faculty');
    });
  });

  describe('POST /api/v1/auth/verify-email', () => {
    it('should verify email successfully', async () => {
      const user = await User.create({
        fullName: 'Test User',
        email: 'verify@example.com',
        passwordHash: await bcrypt.hash('Password123', 10),
        role: 'student',
        status: 'pending',
        verificationToken: 'test-verification-token',
        verificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const response = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({
          token: 'test-verification-token',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Email verified');

      await user.reload();
      expect(user.status).toBe('active');
    });

    it('should return 400 for invalid token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({
          token: 'invalid-token',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      const passwordHash = await bcrypt.hash('Password123', 10);
      const user = await User.create({
        fullName: 'Login User',
        email: 'login@example.com',
        passwordHash,
        role: 'student',
        status: 'active',
      });

      await Student.create({
        userId: user.id,
        studentNumber: 'S123456',
        departmentId: testDepartment.id,
      });
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@example.com',
          password: 'Password123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe('login@example.com');
    });

    it('should return 401 for incorrect password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@example.com',
          password: 'WrongPassword',
        });

      expect(response.status).toBe(401);
    });

    it('should return 401 for inactive user', async () => {
      const passwordHash = await bcrypt.hash('Password123', 10);
      await User.create({
        fullName: 'Inactive User',
        email: 'inactive@example.com',
        passwordHash,
        role: 'student',
        status: 'pending',
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'inactive@example.com',
          password: 'Password123',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken;

    beforeEach(async () => {
      const passwordHash = await bcrypt.hash('Password123', 10);
      const user = await User.create({
        fullName: 'Refresh User',
        email: 'refresh@example.com',
        passwordHash,
        role: 'student',
        status: 'active',
      });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'refresh@example.com',
          password: 'Password123',
        });

      refreshToken = loginResponse.body.tokens.refreshToken;
    });

    it('should refresh access token successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(typeof response.body.accessToken).toBe('string');
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        });

      expect(response.status).toBe(401);
    });
  });


  describe('POST /api/v1/auth/forgot-password', () => {
    beforeEach(async () => {
      await User.create({
        fullName: 'Reset User',
        email: 'reset@example.com',
        passwordHash: await bcrypt.hash('Password123', 10),
        role: 'student',
        status: 'active',
      });
    });

    it('should send reset password email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({
          email: 'reset@example.com',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');

      const user = await User.findOne({ where: { email: 'reset@example.com' } });
      expect(user.resetToken).toBeTruthy();
    });

  });

  describe('POST /api/v1/auth/reset-password', () => {
    beforeEach(async () => {
      await User.create({
        fullName: 'Reset User',
        email: 'reset@example.com',
        passwordHash: await bcrypt.hash('OldPassword123', 10),
        role: 'student',
        status: 'active',
        resetToken: 'test-reset-token',
        resetExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    });

    it('should reset password successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'test-reset-token',
          password: 'NewPassword123',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password updated successfully');

      // Yeni şifre ile giriş yapılabilir mi?
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'reset@example.com',
          password: 'NewPassword123',
        });

      expect(loginResponse.status).toBe(200);
    });

    it('should return 400 for invalid token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'NewPassword123',
        });

      expect(response.status).toBe(400);
    });

  });
});

