const { Router } = require('express');
const yup = require('yup');
const gradeController = require('../controllers/gradeController');
const validateRequest = require('../middleware/validateRequest');
const authenticate = require('../middleware/authMiddleware');
const authorizeRole = require('../middleware/authorizeRole');

const router = Router();

const saveGradesSchema = yup.object({
  sectionId: yup.number().integer().required(),
  grades: yup.array().of(
    yup.object({
      enrollmentId: yup.number().integer().required(),
      midtermGrade: yup.number().min(0).max(100).nullable().optional(),
      finalGrade: yup.number().min(0).max(100).nullable().optional()
    })
  ).required()
});

router.get('/my-grades', authenticate, authorizeRole(['student']), gradeController.myGrades);
router.get('/transcript', authenticate, authorizeRole(['student']), gradeController.transcript);
router.get('/transcript/pdf', authenticate, authorizeRole(['student']), gradeController.transcriptPdf);
router.post('/', authenticate, authorizeRole(['faculty', 'admin']), validateRequest(saveGradesSchema), gradeController.saveGrades);

module.exports = router;
