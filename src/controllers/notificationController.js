const notificationService = require('../services/notificationService');

/**
 * Get all notifications for current user
 */
const getMyNotifications = async (req, res, next) => {
  try {
    const { limit, offset, unreadOnly } = req.query;
    const options = {
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
      unreadOnly: unreadOnly === 'true'
    };

    const result = await notificationService.getUserNotifications(req.user.id, options);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Mark notification as read
 */
const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await notificationService.markAsRead(id, req.user.id);
    res.json(notification);
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAllAsRead(req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a notification
 */
const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    await notificationService.deleteNotification(id, req.user.id);
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Broadcast message to all connected users
 */
const broadcastMessage = async (req, res, next) => {
  try {
    const { type, title, message, ...payload } = req.body;
    const result = await notificationService.broadcastToAll(type, title, message, payload);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  broadcastMessage
};

