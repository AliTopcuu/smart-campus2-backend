const { Router } = require('express');
const yup = require('yup');
const authController = require('../controllers/authController');
const validateRequest = require('../middleware/validateRequest');

const router = Router();

const registerSchema = yup.object({
  fullName: yup.string().min(3).required(),
  email: yup.string().email().required(),
  password: yup
    .string()
    .min(8)
    .matches(/[A-Z]/, 'Password must contain an uppercase letter')
    .matches(/[0-9]/, 'Password must contain a number')
    .required(),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password'), null], 'Passwords must match')
    .required(),
  role: yup.string().oneOf(['student', 'faculty', 'admin']).required(),
  department: yup.string().optional(),
  studentNumber: yup.string().optional(),
  termsAccepted: yup.boolean().oneOf([true], 'Terms must be accepted'),
});

const verifySchema = yup.object({
  token: yup.string().required(),
});

const loginSchema = yup.object({
  email: yup.string().email().required(),
  password: yup.string().required(),
});

router.post('/register', validateRequest(registerSchema), authController.register);
router.post('/verify-email', validateRequest(verifySchema), authController.verifyEmail);
router.post('/login', validateRequest(loginSchema), authController.login);
router.post(
  '/refresh',
  validateRequest(
    yup.object({
      refreshToken: yup.string().required(),
    })
  ),
  authController.refreshSession
);
router.post(
  '/logout',
  validateRequest(
    yup.object({
      refreshToken: yup.string().optional(),
    })
  ),
  authController.logout
);

router.post(
  '/forgot-password',
  validateRequest(
    yup.object({
      email: yup.string().email().required(),
    })
  ),
  authController.forgotPassword
);

router.post(
  '/reset-password',
  validateRequest(
    yup.object({
      token: yup.string().required(),
      password: yup
        .string()
        .min(8)
        .matches(/[A-Z]/, 'Password must contain an uppercase letter')
        .matches(/[0-9]/, 'Password must contain a number')
        .required(),
    })
  ),
  authController.resetPassword
);

module.exports = router;

