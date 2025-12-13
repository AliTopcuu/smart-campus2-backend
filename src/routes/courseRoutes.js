const { Router } = require('express');
const yup = require('yup');
const courseController = require('../controllers/courseController');
const validateRequest = require('../middleware/validateRequest');
const authenticate = require('../middleware/authMiddleware');
const authorizeRole = require('../middleware/authorizeRole');

const router = Router();

const createCourseSchema = yup.object({
  code: yup.string().required(),
  name: yup.string().required(),
  description: yup.string().optional().nullable(),
  credits: yup.number().integer().positive().required(),
  ects: yup.number().integer().positive().required(),
  syllabusUrl: yup
    .string()
    .nullable()
    .optional()
    .transform((value) => (value === '' || !value ? undefined : value))
    .test('is-url', 'Must be a valid URL', (value) => {
      if (!value || value === '') return true; // Empty is allowed
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }),
  departmentId: yup.number().integer().required()
});

const updateCourseSchema = yup.object({
  code: yup.string().optional(),
  name: yup.string().optional(),
  description: yup.string().optional().nullable(),
  credits: yup.number().integer().positive().optional(),
  ects: yup.number().integer().positive().optional(),
  syllabusUrl: yup
    .string()
    .nullable()
    .optional()
    .transform((value) => (value === '' || !value ? undefined : value))
    .test('is-url', 'Must be a valid URL', (value) => {
      if (!value || value === '') return true; // Empty is allowed
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }),
  departmentId: yup.number().integer().optional()
});

router.get('/', authenticate, courseController.list);
router.get('/:id', authenticate, courseController.getById);
router.post('/', 
  authenticate, // 1. Önce kimlik doğrulanır (req.user burada oluşmalı)
  
  // --- DEBUG BAŞLANGICI ---
  (req, res, next) => {
    console.log("------------------------------------------------");
    console.log("DEBUG - Gelen İstek Var!");
    console.log("DEBUG - req.user içeriği:", req.user);
    console.log("DEBUG - req.user.role değeri:", req.user?.role);
    console.log("------------------------------------------------");
    next(); // Hata vermeden sonraki adıma (authorizeRole) geç
  },
  // --- DEBUG BİTİŞİ ---

  authorizeRole(['admin']), 
  validateRequest(createCourseSchema), 
  courseController.create
);
router.put('/:id', authenticate, authorizeRole(['admin']), validateRequest(updateCourseSchema), courseController.update);
router.delete('/:id', authenticate, authorizeRole(['admin']), courseController.remove);

module.exports = router;
