const express = require('express');
const router = express.Router();
const classroomReservationController = require('../controllers/classroomReservationController');
const authenticate = require('../middleware/authMiddleware');
const authorizeRole = require('../middleware/authorizeRole');

// Create reservation (authenticated users)
router.post('/', authenticate, classroomReservationController.createReservation);

// List reservations (filtered by user role)
router.get('/', authenticate, classroomReservationController.listReservations);

// Approve reservation (Admin only)
router.put('/:id/approve', authenticate, authorizeRole(['admin']), classroomReservationController.approveReservation);

// Reject reservation (Admin only)
router.put('/:id/reject', authenticate, authorizeRole(['admin']), classroomReservationController.rejectReservation);

// Cancel reservation (User or Admin)
router.delete('/:id', authenticate, classroomReservationController.cancelReservation);

module.exports = router;

