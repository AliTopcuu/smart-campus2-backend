const crypto = require('crypto');
const bcrypt = require('bcrypt');
const db = require('../models');
const { ValidationError, UnauthorizedError } = require('../utils/errors');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { sendVerificationEmail, sendResetPasswordEmail } = require('../utils/mailer');

const SALT_ROUNDS = 10;
const refreshTokenStore = new Map();
const { User, Student, Faculty, Department } = db;

const ensureDepartment = async (nameOrCode) => {
  const code = (nameOrCode || 'general').toString().toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const [department] = await Department.findOrCreate({
    where: { code },
    defaults: {
      name: nameOrCode || 'General Studies',
      faculty: 'General',
    },
  });

  return department;
};

const buildUserPayload = (user) => {
  const department =
    user.Student?.Department?.name ||
    user.Student?.Department?.code ||
    user.Faculty?.Department?.name ||
    user.Faculty?.Department?.code ||
    null;

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    phone: user.phone,
    avatarUrl: user.profilePictureUrl, // profilePictureUrl'yi avatarUrl olarak döndür
    studentNumber: user.Student?.studentNumber,
    department,
  };
};

const register = async ({ fullName, email, password, role, studentNumber, department }) => {
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    throw new ValidationError('Email already in use');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const verificationToken = crypto.randomUUID();
  const verificationExpires = new Date(Date.now() + 1000 * 60 * 60 * 24);

  let user;
  try {
    user = await User.create({
      fullName,
      email,
      passwordHash,
      role,
      status: 'pending', // Email doğrulaması gerekiyor
      verificationToken,
      verificationExpires,
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new ValidationError('Email already in use');
    }
    throw error;
  }

  if (role === 'student') {
    const dept = await ensureDepartment(department || 'General Studies');
    await Student.create({
      userId: user.id,
      studentNumber: studentNumber || `S${Date.now()}`,
      departmentId: dept.id,
    });
  }

  if (role === 'faculty') {
    const dept = await ensureDepartment(department || 'General Studies');
    await Faculty.create({
      userId: user.id,
      employeeNumber: `F${Date.now()}`,
      title: 'Lecturer',
      departmentId: dept.id,
    });
  }

  console.log(`[register] User created with ID: ${user.id}, email: ${email}`);
  console.log(`[register] Calling sendVerificationEmail...`);

  await sendVerificationEmail(email, verificationToken);

  console.log(`[register] Email sending process completed for: ${email}\n`);

  return {
    message: 'Registration successful. Check your email to verify your account.',
    user: buildUserPayload(user),
  };
};

const verifyEmail = async (token) => {
  const user = await User.findOne({ where: { verificationToken: token } });
  if (!user) {
    throw new ValidationError('Invalid verification token');
  }

  if (user.verificationExpires && user.verificationExpires < new Date()) {
    throw new ValidationError('Verification token has expired');
  }

  user.status = 'active';
  user.verificationToken = null;
  user.verificationExpires = null;
  await user.save();

  return { message: 'Email verified' };
};

const login = async ({ email, password }) => {
  const user = await User.findOne({
    where: { email },
    include: [
      { model: Student, include: [Department] },
      { model: Faculty, include: [Department] },
    ],
  });
  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  if (user.status !== 'active') {
    throw new UnauthorizedError('Please verify your email first');
  }

  const tokens = {
    accessToken: signAccessToken(user),
    refreshToken: (() => {
      const token = signRefreshToken(user);
      refreshTokenStore.set(token, user.id);
      return token;
    })(),
  };

  return {
    user: buildUserPayload(user),
    tokens,
  };
};

const refreshSession = async (refreshToken) => {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError('Invalid refresh token');
  }

  if (!refreshTokenStore.has(refreshToken)) {
    throw new UnauthorizedError('Refresh token is expired or revoked');
  }

  const user = await User.findByPk(payload.sub);
  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  const storedUserId = refreshTokenStore.get(refreshToken);
  if (storedUserId !== user.id) {
    throw new UnauthorizedError('Refresh token mismatch');
  }

  return {
    accessToken: signAccessToken(user),
  };
};

const logout = async (refreshToken) => {
  if (refreshToken) {
    refreshTokenStore.delete(refreshToken);
  }
};

const invalidateUserSessions = (userId) => {
  for (const [token, value] of refreshTokenStore.entries()) {
    if (value === userId) {
      refreshTokenStore.delete(token);
    }
  }
};

const forgotPassword = async (email) => {
  console.log(`\n[forgotPassword] Request received for email: ${email}`);

  const user = await User.findOne({ where: { email } });
  if (!user) {
    console.log(`[forgotPassword] User not found for email: ${email}`);
    return { message: 'If the account exists, a reset link has been sent.' };
  }

  const resetToken = crypto.randomUUID();
  const resetExpires = new Date(Date.now() + 1000 * 60 * 60 * 24);
  user.resetToken = resetToken;
  user.resetExpires = resetExpires;
  await user.save();

  console.log(`[forgotPassword] Reset token generated for user: ${user.id}, email: ${email}`);
  console.log(`[forgotPassword] Calling sendResetPasswordEmail...`);

  await sendResetPasswordEmail(email, resetToken);

  console.log(`[forgotPassword] Email sending process completed for: ${email}\n`);
  return { message: 'Reset instructions sent.' };
};

const resetPassword = async ({ token, password }) => {
  const user = await User.findOne({ where: { resetToken: token } });
  if (!user) {
    throw new ValidationError('Invalid reset token');
  }

  if (user.resetExpires && user.resetExpires < new Date()) {
    throw new ValidationError('Reset token has expired');
  }

  user.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  user.resetToken = null;
  user.resetExpires = null;
  await user.save();

  invalidateUserSessions(user.id);
  return { message: 'Password updated successfully' };
};

const getProfile = async (userId) => {
  const user = await User.findByPk(userId, {
    include: [
      { model: Student, include: [Department] },
      { model: Faculty, include: [Department] },
    ],
  });

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  return buildUserPayload(user);
};

module.exports = {
  register,
  verifyEmail,
  login,
  refreshSession,
  logout,
  forgotPassword,
  resetPassword,
  getProfile,
  buildUserPayload,
};

