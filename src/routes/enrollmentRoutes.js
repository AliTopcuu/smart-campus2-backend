const { Router } = require('express');
const yup = require('yup');
const enrollmentController = require('../controllers/enrollmentController');
const validateRequest = require('../middleware/validateRequest');
const authenticate = require('../middleware/authMiddleware');
const authorizeRole = require('../middleware/authorizeRole');

const router = Router();

const enrollSchema = yup.object({
  sectionId: yup
    .number()
    .transform((value, originalValue) => {
      // Convert string to number if needed
      if (typeof originalValue === 'string' && originalValue !== '') {
        const parsed = parseInt(originalValue, 10);
        return isNaN(parsed) ? NaN : parsed;
      }
      return originalValue;
    })
    .integer('sectionId must be an integer')
    .required('sectionId is required')
});

router.post('/', authenticate, authorizeRole(['student']), validateRequest(enrollSchema), enrollmentController.enroll);
router.delete('/:id', authenticate, authorizeRole(['student']), enrollmentController.drop);
router.get('/my-courses', authenticate, authorizeRole(['student']), enrollmentController.myCourses);
router.get('/students/:sectionId', authenticate, authorizeRole(['faculty', 'admin']), enrollmentController.sectionStudents);
router.get('/pending/:sectionId', authenticate, authorizeRole(['faculty', 'admin']), enrollmentController.getPendingEnrollments);
router.patch('/:id/approve', authenticate, authorizeRole(['faculty', 'admin']), enrollmentController.approveEnrollment);
router.patch('/:id/reject', authenticate, authorizeRole(['faculty', 'admin']), enrollmentController.rejectEnrollment);

module.exports = router;
