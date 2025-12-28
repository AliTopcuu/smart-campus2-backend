const { Router } = require('express');
const yup = require('yup');
const eventController = require('../controllers/eventController');
const validateRequest = require('../middleware/validateRequest');
const authenticate = require('../middleware/authMiddleware');
const authorizeRole = require('../middleware/authorizeRole');

const router = Router();

const registerSchema = yup.object({
  eventId: yup.number().integer().positive().required()
});

const checkInSchema = yup.object({
  qrCodeData: yup.string().required()
});

const createEventSchema = yup.object({
  title: yup.string().required('Title is required'),
  description: yup.string().optional().nullable(),
  date: yup.date().required('Date is required'),
  location: yup.string().required('Location is required'),
  capacity: yup.number().integer().positive().required('Capacity is required'),
  surveySchema: yup.mixed().optional().nullable()
});

const updateEventSchema = yup.object({
  title: yup.string().optional(),
  description: yup.string().optional().nullable(),
  date: yup.date().optional(),
  location: yup.string().optional(),
  capacity: yup.number().integer().positive().optional(),
  status: yup.string().oneOf(['active', 'cancelled', 'completed']).optional(),
  surveySchema: yup.mixed().optional().nullable()
});

// Public routes (authenticated users)
router.get('/', authenticate, eventController.list);

// User routes
router.post('/register', authenticate, validateRequest(registerSchema), eventController.registerForEvent);
router.get('/my-registrations', authenticate, eventController.myRegistrations);

// Admin routes - must be before /:id route to avoid route conflicts
router.post('/', authenticate, authorizeRole(['admin']), validateRequest(createEventSchema), eventController.create);
router.get('/:id/participants', authenticate, authorizeRole(['admin']), eventController.getEventParticipants);
router.get('/:id/waitlist', authenticate, authorizeRole(['admin']), eventController.getEventWaitlist);
router.delete('/:id/participants/:registrationId', authenticate, authorizeRole(['admin']), eventController.removeParticipant);

// Public routes (must be after specific routes)
router.get('/:id', authenticate, eventController.getById);

// Admin routes (must be after /:id/participants)
router.put('/:id', authenticate, authorizeRole(['admin']), validateRequest(updateEventSchema), eventController.update);
router.delete('/:id', authenticate, authorizeRole(['admin']), eventController.remove);

// Admin/Faculty routes
router.post('/check-in', authenticate, authorizeRole(['admin', 'faculty']), validateRequest(checkInSchema), eventController.checkIn);

module.exports = router;

