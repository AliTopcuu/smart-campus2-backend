const nodemailer = require('nodemailer');

// Email gönderimi devre dışı - sadece loglara yaz
const isMailConfigured = false; // Email gönderimini devre dışı bırak
const transporter = null;

const sendVerificationEmail = async (email, token) => {
  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
  const verificationUrl = `${baseUrl}/verify-email?token=${token}`;

  if (!transporter) {
    console.log('\n========================================');
    console.log('📧 EMAIL VERIFICATION LINK (NOT SENT - MAIL NOT CONFIGURED)');
    console.log('========================================');
    console.log(`To: ${email}`);
    console.log(`Verification Link: ${verificationUrl}`);
    console.log(`Token: ${token}`);
    console.log('========================================\n');
    return;
  }

  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'no-reply@smartcampus.edu',
    to: email,
    subject: 'Verify your Smart Campus account',
    text: `Click on the link to verify your account: ${verificationUrl}`,
    html: `<p>Click on the link to verify your account:</p><a href="${verificationUrl}">${verificationUrl}</a>`,
  });
};

const sendResetPasswordEmail = async (email, token) => {
  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  if (!transporter) {
    console.log('\n========================================');
    console.log('🔑 PASSWORD RESET LINK (NOT SENT - MAIL NOT CONFIGURED)');
    console.log('========================================');
    console.log(`To: ${email}`);
    console.log(`Reset Password Link: ${resetUrl}`);
    console.log(`Token: ${token}`);
    console.log('========================================\n');
    return;
  }

  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'no-reply@smartcampus.edu',
    to: email,
    subject: 'Reset your Smart Campus password',
    text: `Reset your password using this link: ${resetUrl}`,
    html: `<p>Reset your password using this link:</p><a href="${resetUrl}">${resetUrl}</a>`,
  });
};

module.exports = {
  sendVerificationEmail,
  sendResetPasswordEmail,
};
