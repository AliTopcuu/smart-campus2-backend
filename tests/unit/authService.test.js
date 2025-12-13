const bcrypt = require('bcrypt');
const authService = require('../../src/services/authService');
const db = require('../../src/models');
const { User, Student, Faculty, Department } = db;

describe('AuthService - Unit Tests', () => {
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

  describe('register', () => {
    it('should register a new student user successfully', async () => {
      const userData = {
        fullName: 'John Doe',
        email: 'john@example.com',
        password: 'Password123',
        role: 'student',
        studentNumber: 'S123456',
        department: 'Computer Science',
      };

      const result = await authService.register(userData);

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('john@example.com');
      expect(result.user.role).toBe('student');

      // Veritabanında kullanıcı oluşturuldu mu?
      const user = await User.findOne({ where: { email: 'john@example.com' } });
      expect(user).toBeTruthy();
      expect(user.status).toBe('pending');
      expect(user.verificationToken).toBeTruthy();

      // Öğrenci kaydı oluşturuldu mu?
      const student = await Student.findOne({ where: { userId: user.id } });
      expect(student).toBeTruthy();
      expect(student.studentNumber).toBe('S123456');
    });

    it('should throw error if email already exists', async () => {
      const userData = {
        fullName: 'First User',
        email: 'duplicate@example.com',
        password: 'Password123',
        role: 'student',
        department: 'Computer Science',
      };

      await authService.register(userData);

      // Aynı email ile tekrar kayıt denemesi
      await expect(authService.register(userData)).rejects.toThrow('Email already in use');
    });

  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const user = await User.create({
        fullName: 'Test User',
        email: 'verify@example.com',
        passwordHash: await bcrypt.hash('Password123', 10),
        role: 'student',
        status: 'pending',
        verificationToken: 'test-token-123',
        verificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const result = await authService.verifyEmail('test-token-123');

      expect(result.message).toBe('Email verified');
      await user.reload();
      expect(user.status).toBe('active');
    });

    it('should throw error for invalid token', async () => {
      await expect(authService.verifyEmail('invalid-token')).rejects.toThrow('Invalid verification token');
    });

  });

  describe('login', () => {
    it('should login successfully with correct credentials', async () => {
      const passwordHash = await bcrypt.hash('Password123', 10);
      const user = await User.create({
        fullName: 'Test User',
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

      const result = await authService.login({
        email: 'login@example.com',
        password: 'Password123',
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('login@example.com');
    });

    it('should throw error for incorrect password', async () => {
      const passwordHash = await bcrypt.hash('Password123', 10);
      await User.create({
        fullName: 'Test User',
        email: 'wrongpass@example.com',
        passwordHash,
        role: 'student',
        status: 'active',
      });

      await expect(
        authService.login({
          email: 'wrongpass@example.com',
          password: 'WrongPassword',
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for inactive user', async () => {
      const passwordHash = await bcrypt.hash('Password123', 10);
      await User.create({
        fullName: 'Test User',
        email: 'inactive@example.com',
        passwordHash,
        role: 'student',
        status: 'pending',
      });

      await expect(
        authService.login({
          email: 'inactive@example.com',
          password: 'Password123',
        })
      ).rejects.toThrow('Please verify your email first');
    });
  });

  describe('refreshSession', () => {
    it('should refresh access token successfully', async () => {
      await User.create({
        fullName: 'Test User',
        email: 'refresh@example.com',
        passwordHash: await bcrypt.hash('Password123', 10),
        role: 'student',
        status: 'active',
      });

      const loginResult = await authService.login({
        email: 'refresh@example.com',
        password: 'Password123',
      });

      const refreshResult = await authService.refreshSession(loginResult.tokens.refreshToken);

      expect(refreshResult).toHaveProperty('accessToken');
      expect(refreshResult.accessToken).toBeTruthy();
    });

    it('should throw error for invalid refresh token', async () => {
      await expect(authService.refreshSession('invalid-token')).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('forgotPassword', () => {
    it('should create reset token for existing user', async () => {
      const user = await User.create({
        fullName: 'Test User',
        email: 'reset@example.com',
        passwordHash: await bcrypt.hash('Password123', 10),
        role: 'student',
        status: 'active',
      });

      const result = await authService.forgotPassword('reset@example.com');

      expect(result.message).toBeTruthy();
      await user.reload();
      expect(user.resetToken).toBeTruthy();
    });

  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const user = await User.create({
        fullName: 'Test User',
        email: 'reset@example.com',
        passwordHash: await bcrypt.hash('OldPassword123', 10),
        role: 'student',
        status: 'active',
        resetToken: 'reset-token-123',
        resetExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const result = await authService.resetPassword({
        token: 'reset-token-123',
        password: 'NewPassword123',
      });

      expect(result.message).toBe('Password updated successfully');
      await user.reload();
      expect(user.resetToken).toBeNull();
    });

    it('should throw error for invalid reset token', async () => {
      await expect(
        authService.resetPassword({
          token: 'invalid-token',
          password: 'NewPassword123',
        })
      ).rejects.toThrow('Invalid reset token');
    });

  });

  describe('getProfile', () => {
    it('should get user profile successfully', async () => {
      const user = await User.create({
        fullName: 'Test User',
        email: 'profile@example.com',
        passwordHash: await bcrypt.hash('Password123', 10),
        role: 'student',
        status: 'active',
      });

      await Student.create({
        userId: user.id,
        studentNumber: 'S123456',
        departmentId: testDepartment.id,
      });

      const profile = await authService.getProfile(user.id);

      expect(profile).toHaveProperty('id');
      expect(profile).toHaveProperty('email');
      expect(profile.email).toBe('profile@example.com');
    });

    it('should throw error for non-existent user', async () => {
      await expect(authService.getProfile(99999)).rejects.toThrow('User not found');
    });
  });
});

