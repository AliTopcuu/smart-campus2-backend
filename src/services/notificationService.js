const db = require('../models');
const { Notification, User } = db;

/**
 * Create a notification for a single user
 */
const createNotification = async (userId, type, title, message, metadata = null) => {
  try {
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      metadata
    });
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Create notifications for multiple users
 */
const createBulkNotifications = async (userIds, type, title, message, metadata = null) => {
  try {
    const notifications = userIds.map(userId => ({
      userId,
      type,
      title,
      message,
      metadata
    }));

    await Notification.bulkCreate(notifications);
    return { count: notifications.length };
  } catch (error) {
    console.error('Error creating bulk notifications:', error);
    throw error;
  }
};

/**
 * Get all notifications for a user
 */
const getUserNotifications = async (userId, options = {}) => {
  const { limit = 50, offset = 0, unreadOnly = false } = options;

  const where = { userId };
  if (unreadOnly) {
    where.isRead = false;
  }

  const notifications = await Notification.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit,
    offset
  });

  const total = await Notification.count({ where });
  const unreadCount = await Notification.count({ 
    where: { ...where, isRead: false } 
  });

  return {
    notifications,
    total,
    unreadCount,
    limit,
    offset
  };
};

/**
 * Mark notification as read
 */
const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOne({
    where: {
      id: notificationId,
      userId // Ensure user owns the notification
    }
  });

  if (!notification) {
    throw new Error('Notification not found');
  }

  notification.isRead = true;
  await notification.save();
  return notification;
};

/**
 * Mark all notifications as read for a user
 */
const markAllAsRead = async (userId) => {
  const result = await Notification.update(
    { isRead: true },
    {
      where: {
        userId,
        isRead: false
      }
    }
  );
  return { updatedCount: result[0] };
};

/**
 * Delete a notification
 */
const deleteNotification = async (notificationId, userId) => {
  const notification = await Notification.findOne({
    where: {
      id: notificationId,
      userId // Ensure user owns the notification
    }
  });

  if (!notification) {
    throw new Error('Notification not found');
  }

  await notification.destroy();
  return { success: true };
};

/**
 * Get all students (for event notifications)
 */
const getAllStudents = async () => {
  const students = await User.findAll({
    where: {
      role: 'student'
    },
    attributes: ['id']
  });
  return students.map(s => s.id);
};

module.exports = {
  createNotification,
  createBulkNotifications,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getAllStudents
};

