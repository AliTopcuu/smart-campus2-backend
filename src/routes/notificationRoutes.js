const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authenticate = require('../middleware/authMiddleware');

const authorizeRole = require('../middleware/authorizeRole');

// All routes require authentication
router.use(authenticate);

// Broadcast notification (Admin only)
router.post('/broadcast', authorizeRole('admin'), notificationController.broadcastMessage);

// Get user's notifications
router.get('/', notificationController.getMyNotifications);

// Mark notification as read
router.patch('/:id/read', notificationController.markAsRead);

// Mark all notifications as read
router.patch('/read-all', notificationController.markAllAsRead);

// Delete notification
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;

