const express = require('express');
const router = express.Router();
const schedulingController = require('../controllers/schedulingController');
const authenticate = require('../middleware/authMiddleware');
const authorizeRole = require('../middleware/authorizeRole');

// Generate schedule (Admin only)
router.post('/generate', authenticate, authorizeRole(['admin']), schedulingController.generateSchedule);

// Apply schedule (Admin only)
router.post('/apply', authenticate, authorizeRole(['admin']), schedulingController.applySchedule);

// Get my schedule (Student/Instructor)
router.get('/my-schedule', authenticate, schedulingController.getMySchedule);

// Export schedule as iCal (Student/Instructor)
router.get('/my-schedule/ical', authenticate, schedulingController.exportICal);

module.exports = router;

