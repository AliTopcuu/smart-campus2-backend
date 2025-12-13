const { Router } = require('express');
const yup = require('yup');
const sectionController = require('../controllers/sectionController');
const validateRequest = require('../middleware/validateRequest');
const authenticate = require('../middleware/authMiddleware');
const authorizeRole = require('../middleware/authorizeRole');

const router = Router();

const createSectionSchema = yup.object({
  courseId: yup.number().integer().required(),
  sectionNumber: yup.number().integer().positive().required(),
  semester: yup.string().oneOf(['Fall', 'Spring', 'Summer']).required(),
  year: yup.number().integer().required(),
  instructorId: yup.number().integer().optional(),
  capacity: yup.number().integer().positive().optional(),
  scheduleJson: yup.object().optional(),
  classroomId: yup.number().integer().optional()
});

const updateSectionSchema = yup.object({
  courseId: yup.number().integer().optional(),
  sectionNumber: yup.number().integer().positive().optional(),
  semester: yup.string().oneOf(['Fall', 'Spring', 'Summer']).optional(),
  year: yup.number().integer().optional(),
  instructorId: yup.number().integer().nullable().optional(),
  capacity: yup.number().integer().positive().optional(),
  scheduleJson: yup.object().optional(),
  classroomId: yup.number().integer().nullable().optional()
});

router.get('/', authenticate, sectionController.list);
router.get('/my-sections', authenticate, authorizeRole(['faculty', 'admin']), sectionController.mySections);
router.get('/:id', authenticate, sectionController.getById);
router.post('/', authenticate, authorizeRole(['admin']), validateRequest(createSectionSchema), sectionController.create);
router.put('/:id', authenticate, authorizeRole(['admin']), validateRequest(updateSectionSchema), sectionController.update);

module.exports = router;
