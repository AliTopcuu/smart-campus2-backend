const db = require('../models');
const { Event, EventRegistration, Waitlist } = db;
const { ValidationError, NotFoundError } = require('../utils/errors');
const crypto = require('crypto');
const { Op } = require('sequelize');
const notificationService = require('../services/notificationService');

const MAX_RETRY_ATTEMPTS = 3;

/**
 * Register user for an event with optimistic locking and waitlist support
 */
const registerForEvent = async (req, res, next) => {
  const { eventId } = req.body;
  const userId = req.user.id;

  if (!eventId) {
    return next(new ValidationError('Event ID is required'));
  }

  let retryCount = 0;
  let lastError = null;

  // Retry logic for optimistic locking conflicts
  while (retryCount < MAX_RETRY_ATTEMPTS) {
    const t = await db.sequelize.transaction();

    try {
      // 1. Check if user is already registered
      const existingRegistration = await EventRegistration.findOne({
        where: {
          userId,
          eventId
        },
        transaction: t
      });

      if (existingRegistration) {
        await t.rollback();
        throw new ValidationError('You are already registered for this event');
      }

      // Check if user is already on waitlist
      const existingWaitlist = await Waitlist.findOne({
        where: {
          userId,
          eventId
        },
        transaction: t
      });

      if (existingWaitlist) {
        await t.rollback();
        throw new ValidationError('You are already on the waitlist for this event');
      }

      // 2. Get event with version for optimistic locking
      const event = await Event.findByPk(eventId, {
        transaction: t
      });

      if (!event) {
        await t.rollback();
        throw new NotFoundError('Event not found');
      }

      // Check if event is active
      if (event.status !== 'active') {
        await t.rollback();
        throw new ValidationError(`Event is ${event.status}. Registration is not available.`);
      }

      // 3. Capacity Management with Optimistic Locking
      if (event.currentParticipants < event.capacity) {
        // There's space available - register the user

        // Generate unique QR code
        const qrCodeData = `EVENT-${eventId}-${userId}-${crypto.randomUUID()}`;

        // Create registration
        // Use qrCode field name to match database column
        // Explicitly specify attributes to avoid any field mapping issues
        const registration = await EventRegistration.create({
          userId,
          eventId,
          status: 'registered',
          qrCode: qrCodeData // Use qrCode field name for database
        }, {
          transaction: t,
          fields: ['userId', 'eventId', 'status', 'qrCode'] // Explicitly specify fields
        });

        // Update event: increment currentParticipants and version
        const updatedRows = await Event.update(
          {
            currentParticipants: event.currentParticipants + 1,
            version: event.version + 1
          },
          {
            where: {
              id: eventId,
              version: event.version // Optimistic lock: only update if version matches
            },
            transaction: t
          }
        );

        // Check if update was successful (optimistic locking conflict check)
        if (updatedRows[0] === 0) {
          // Version conflict - another transaction updated the event
          await t.rollback();
          retryCount++;
          lastError = new ValidationError('Registration conflict. Please try again.');

          // Wait a bit before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 100 * retryCount));
          continue; // Retry the transaction
        }

        // Success - commit transaction
        await t.commit();

        return res.status(201).json({
          message: 'Successfully registered for the event',
          registration: {
            id: registration.id,
            eventId: registration.eventId,
            status: registration.status,
            qrCodeData: registration.qrCode // Map qrCode to qrCodeData for frontend
          }
        });

      } else {
        // Capacity is full - add to waitlist
        const waitlistEntry = await Waitlist.create({
          userId,
          eventId,
          requestDate: new Date()
        }, { transaction: t });

        await t.commit();

        return res.status(201).json({
          message: 'Yedek listeye alındınız',
          waitlist: {
            id: waitlistEntry.id,
            eventId: waitlistEntry.eventId,
            requestDate: waitlistEntry.requestDate
          }
        });
      }

    } catch (error) {
      await t.rollback();

      // If it's a validation/not found error, don't retry
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        return next(error);
      }

      // For other errors, retry if we haven't exceeded max attempts
      retryCount++;
      lastError = error;

      if (retryCount < MAX_RETRY_ATTEMPTS) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 100 * retryCount));
        continue;
      } else {
        // Max retries exceeded
        console.error('Event registration failed after max retries:', error);
        return next(error);
      }
    }
  }

  // If we exit the loop without success, return the last error
  return next(lastError || new ValidationError('Registration failed. Please try again.'));
};

/**
 * Get list of events with optional filtering
 */
const list = async (req, res, next) => {
  try {
    const { search, status, dateFilter } = req.query;
    const where = {};

    // Status filter
    if (status && ['active', 'cancelled', 'completed'].includes(status)) {
      where.status = status;
    }

    // Date filter
    if (dateFilter === 'upcoming') {
      where.date = { [Op.gte]: new Date() };
    } else if (dateFilter === 'past') {
      where.date = { [Op.lt]: new Date() };
    }

    // Search filter (title or description)
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const events = await Event.findAll({
      where,
      include: [
        {
          model: db.User,
          as: 'creator',
          attributes: ['id', 'fullName', 'email']
        }
      ],
      order: [['date', 'ASC']]
    });

    // Calculate dynamic status based on endDate
    const now = new Date();
    const eventsWithDynamicStatus = events.map(event => {
      const eventJson = event.toJSON();

      // If event is cancelled, keep that status
      if (eventJson.status === 'cancelled') {
        eventJson.computedStatus = 'cancelled';
      }
      // If endDate exists and has passed, mark as completed
      else if (eventJson.endDate && new Date(eventJson.endDate) < now) {
        eventJson.computedStatus = 'completed';
      }
      // If start date hasn't arrived yet
      else if (new Date(eventJson.date) > now) {
        eventJson.computedStatus = 'upcoming';
      }
      // Event is ongoing
      else {
        eventJson.computedStatus = 'active';
      }

      return eventJson;
    });

    res.json(eventsWithDynamicStatus);
  } catch (error) {
    console.error('List events error:', error);
    next(error);
  }
};

/**
 * Get event by ID with details
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const event = await Event.findByPk(id, {
      include: [
        {
          model: db.User,
          as: 'creator',
          attributes: ['id', 'fullName', 'email']
        }
      ]
    });

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    res.json(event);
  } catch (error) {
    console.error('Get event by ID error:', error);
    next(error);
  }
};

/**
 * Get current user's event registrations
 */
const myRegistrations = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const registrations = await EventRegistration.findAll({
      where: { userId },
      include: [
        {
          model: Event,
          as: 'event',
          include: [
            {
              model: db.User,
              as: 'creator',
              attributes: ['id', 'fullName', 'email']
            }
          ]
        },
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'fullName', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Map qrCode to qrCodeData for frontend compatibility
    const mappedRegistrations = registrations.map(reg => {
      const json = reg.toJSON();
      return {
        ...json,
        qrCodeData: json.qrCode, // Map qrCode to qrCodeData for frontend
        checkInTime: json.checkedInAt || json.checkInTime // Map checkedInAt to checkInTime for frontend
      };
    });

    res.json(mappedRegistrations);
  } catch (error) {
    console.error('Get my registrations error:', error);
    next(error);
  }
};

/**
 * Check-in user using QR code
 */
const checkIn = async (req, res, next) => {
  const t = await db.sequelize.transaction();

  try {
    const { qrCodeData } = req.body;

    if (!qrCodeData) {
      await t.rollback();
      throw new ValidationError('QR code data is required');
    }

    // Find registration by QR code
    // Query using qrCode column name directly
    const registration = await EventRegistration.findOne({
      where: { qrCode: qrCodeData },
      include: [
        {
          model: Event,
          as: 'event'
        },
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'fullName', 'email']
        }
      ],
      transaction: t
    });

    if (!registration) {
      await t.rollback();
      throw new NotFoundError('Invalid QR code. Registration not found.');
    }

    // Check if already checked in
    if (registration.status === 'checked-in') {
      await t.rollback();
      throw new ValidationError('User has already checked in for this event');
    }

    // Check if cancelled
    if (registration.status === 'cancelled') {
      await t.rollback();
      throw new ValidationError('This registration has been cancelled');
    }

    // Check if event is active
    if (registration.event.status !== 'active') {
      await t.rollback();
      throw new ValidationError(`Event is ${registration.event.status}. Check-in is not available.`);
    }

    // Update registration status to checked-in
    // Model maps checkInTime to checkedInAt column automatically
    await registration.update(
      {
        status: 'checked-in',
        checkInTime: new Date()
      },
      { transaction: t }
    );

    await t.commit();

    res.json({
      message: 'Check-in successful',
      user: {
        id: registration.user.id,
        fullName: registration.user.fullName,
        email: registration.user.email
      },
      event: {
        id: registration.event.id,
        title: registration.event.title,
        location: registration.event.location,
        date: registration.event.date
      },
      checkInTime: registration.checkInTime || registration.checkedInAt
    });
  } catch (error) {
    await t.rollback();
    console.error('Check-in error:', error);
    next(error);
  }
};

/**
 * Create a new event (Admin only)
 */
const create = async (req, res, next) => {
  try {
    const { title, description, category, date, endDate, location, capacity, surveySchema } = req.body;
    const createdBy = req.user.id;

    // Validate required fields
    if (!title || !date || !location || !capacity) {
      throw new ValidationError('Title, date, location, and capacity are required');
    }

    if (capacity < 1) {
      throw new ValidationError('Capacity must be at least 1');
    }

    const event = await Event.create({
      title,
      description,
      category: category || null,
      date,
      startDate: date,
      endDate: endDate || null,
      location,
      capacity,
      currentParticipants: 0,
      version: 0,
      status: 'active',
      surveySchema: surveySchema || null,
      createdBy
    });

    // Reload with associations
    const createdEvent = await Event.findByPk(event.id, {
      include: [
        {
          model: db.User,
          as: 'creator',
          attributes: ['id', 'fullName', 'email']
        }
      ]
    });

    // Tüm öğrencilere bildirim gönder
    try {
      const studentIds = await notificationService.getAllStudents();
      if (studentIds.length > 0) {
        const notificationTitle = 'Yeni Etkinlik Duyurusu';
        const eventDate = new Date(event.date);
        const formattedDate = eventDate.toLocaleDateString('tr-TR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        const message = `${event.title} - ${event.location} - ${formattedDate}`;
        
        await notificationService.createBulkNotifications(
          studentIds,
          'event',
          notificationTitle,
          message,
          {
            eventId: event.id,
            eventTitle: event.title,
            eventDate: event.date,
            eventLocation: event.location,
            eventCapacity: event.capacity
          }
        );
      }
    } catch (error) {
      // Bildirim gönderme hatası etkinlik oluşturmayı engellemez
      console.error('Error sending event notifications:', error);
    }

    res.status(201).json(createdEvent);
  } catch (error) {
    console.error('Create event error:', error);
    next(error);
  }
};

/**
 * Update an event (Admin only)
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, category, date, endDate, location, capacity, status, surveySchema } = req.body;

    const event = await Event.findByPk(id);

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    // Validate capacity if provided
    if (capacity !== undefined) {
      if (capacity < 1) {
        throw new ValidationError('Capacity must be at least 1');
      }
      if (capacity < event.currentParticipants) {
        throw new ValidationError(`Capacity cannot be less than current participants (${event.currentParticipants})`);
      }
    }

    // Validate status if provided
    if (status && !['active', 'cancelled', 'completed'].includes(status)) {
      throw new ValidationError('Invalid status. Must be active, cancelled, or completed');
    }

    // Update fields
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (date !== undefined) updateData.date = date;
    if (endDate !== undefined) updateData.endDate = endDate;
    if (location !== undefined) updateData.location = location;
    if (capacity !== undefined) updateData.capacity = capacity;
    if (status !== undefined) updateData.status = status;
    if (surveySchema !== undefined) updateData.surveySchema = surveySchema;

    await event.update(updateData);

    // Reload with associations
    const updatedEvent = await Event.findByPk(event.id, {
      include: [
        {
          model: db.User,
          as: 'creator',
          attributes: ['id', 'fullName', 'email']
        }
      ]
    });

    res.json(updatedEvent);
  } catch (error) {
    console.error('Update event error:', error);
    next(error);
  }
};

/**
 * Get event participants (Admin only)
 */
const getEventParticipants = async (req, res, next) => {
  try {
    const { id } = req.params;

    const event = await Event.findByPk(id);
    if (!event) {
      throw new NotFoundError('Event not found');
    }

    const registrations = await EventRegistration.findAll({
      where: { eventId: id },
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'fullName', 'email', 'role']
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    // Map to include user info and registration details
    const participants = registrations.map(reg => ({
      id: reg.id,
      userId: reg.userId,
      eventId: reg.eventId,
      status: reg.status,
      qrCode: reg.qrCode,
      checkInTime: reg.checkInTime || reg.checkedInAt,
      createdAt: reg.createdAt,
      user: {
        id: reg.user.id,
        fullName: reg.user.fullName,
        email: reg.user.email,
        role: reg.user.role
      }
    }));

    res.json({
      event: {
        id: event.id,
        title: event.title,
        capacity: event.capacity,
        currentParticipants: event.currentParticipants
      },
      participants
    });
  } catch (error) {
    console.error('Get event participants error:', error);
    next(error);
  }
};

/**
 * Remove participant from event (Admin only)
 */
const removeParticipant = async (req, res, next) => {
  const t = await db.sequelize.transaction();

  try {
    const { id, registrationId } = req.params;

    // Verify event exists
    const event = await Event.findByPk(id, { transaction: t });
    if (!event) {
      await t.rollback();
      throw new NotFoundError('Event not found');
    }

    // Find registration
    const registration = await EventRegistration.findOne({
      where: { id: registrationId, eventId: id },
      transaction: t
    });

    if (!registration) {
      await t.rollback();
      throw new NotFoundError('Registration not found');
    }

    // Delete registration
    await registration.destroy({ transaction: t });

    // Decrement currentParticipants if status was registered or checked-in
    if (registration.status === 'registered' || registration.status === 'checked-in') {
      await Event.update(
        {
          currentParticipants: Math.max(0, event.currentParticipants - 1),
          version: event.version + 1
        },
        {
          where: { id },
          transaction: t
        }
      );
    }

    await t.commit();

    res.json({
      message: 'Participant removed successfully',
      registration: {
        id: registration.id,
        userId: registration.userId
      }
    });
  } catch (error) {
    await t.rollback();
    console.error('Remove participant error:', error);
    next(error);
  }
};

/**
 * Delete an event (Admin only)
 */
const remove = async (req, res, next) => {
  const t = await db.sequelize.transaction();

  try {
    const { id } = req.params;

    const event = await Event.findByPk(id, {
      transaction: t
    });

    if (!event) {
      await t.rollback();
      throw new NotFoundError('Event not found');
    }

    // Check if there are registrations
    const registrationCount = await EventRegistration.count({
      where: { eventId: id },
      transaction: t
    });

    if (registrationCount > 0) {
      await t.rollback();
      throw new ValidationError('Cannot delete event with existing registrations. Cancel the event instead.');
    }

    // Delete waitlist entries
    await Waitlist.destroy({
      where: { eventId: id },
      transaction: t
    });

    // Delete event
    await event.destroy({ transaction: t });

    await t.commit();

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Delete event error:', error);
    next(error);
  }
};

module.exports = {
  registerForEvent,
  list,
  getById,
  myRegistrations,
  checkIn,
  create,
  update,
  remove,
  getEventParticipants,
  removeParticipant
};

