const db = require('../models');
const { ClassroomReservation, Classroom, User } = db;
const { ValidationError, NotFoundError } = require('../utils/errors');
const { Op } = require('sequelize');

/**
 * Create a new classroom reservation
 */
exports.createReservation = async (req, res, next) => {
  const t = await db.sequelize.transaction();
  try {
    const { classroomId, date, startTime, endTime, purpose } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!classroomId || !date || !startTime || !endTime || !purpose) {
      throw new ValidationError('All fields are required: classroomId, date, startTime, endTime, purpose');
    }

    // Validate date is not in the past
    const reservationDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (reservationDate < today) {
      throw new ValidationError('Cannot reserve classroom for past dates');
    }

    // Validate time range
    if (startTime >= endTime) {
      throw new ValidationError('End time must be after start time');
    }

    // Check if classroom exists
    const classroom = await Classroom.findByPk(classroomId, { transaction: t });
    if (!classroom) {
      throw new NotFoundError('Classroom not found');
    }

    // Check for conflicts (overlapping reservations)
    const conflictingReservation = await ClassroomReservation.findOne({
      where: {
        classroomId,
        date,
        status: {
          [Op.in]: ['pending', 'approved']
        },
        [Op.or]: [
          {
            [Op.and]: [
              { startTime: { [Op.lte]: startTime } },
              { endTime: { [Op.gt]: startTime } }
            ]
          },
          {
            [Op.and]: [
              { startTime: { [Op.lt]: endTime } },
              { endTime: { [Op.gte]: endTime } }
            ]
          },
          {
            [Op.and]: [
              { startTime: { [Op.gte]: startTime } },
              { endTime: { [Op.lte]: endTime } }
            ]
          }
        ]
      },
      transaction: t
    });

    if (conflictingReservation) {
      throw new ValidationError('Classroom is already reserved for this time slot');
    }

    // Check for conflicts with course sections (scheduled classes)
    // First, check by classroomId (new format)
    const conflictingSections = await db.CourseSection.findAll({
      where: {
        [Op.or]: [
          { classroomId: classroomId },
          {
            scheduleJson: {
              [Op.ne]: null
            }
          }
        ]
      },
      transaction: t
    });

    // Get classroom info for string matching (backward compatibility)
    // Note: classroom is already fetched above, reuse it
    const classroomString = classroom ? `${classroom.building}-${classroom.roomNumber}` : null;

    for (const conflictingSection of conflictingSections) {
      // Skip if classroomId doesn't match (unless we're checking string format)
      if (conflictingSection.classroomId && conflictingSection.classroomId !== classroomId) {
        continue;
      }

      let scheduleJson = conflictingSection.scheduleJson;
      if (typeof scheduleJson === 'string') {
        try {
          scheduleJson = JSON.parse(scheduleJson);
        } catch (e) {
          scheduleJson = null;
        }
      }

      if (scheduleJson) {
        // Check if this section uses this classroom (by ID or string)
        const sectionUsesThisClassroom = 
          conflictingSection.classroomId === classroomId ||
          (classroomString && scheduleJson.classroom === classroomString);

        if (!sectionUsesThisClassroom) {
          continue;
        }

        // Check if reservation date matches section schedule
        const reservationDay = new Date(date).getDay(); // 0 = Sunday, 1 = Monday, etc.
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[reservationDay].toLowerCase();

        // Check scheduleItems format
        if (Array.isArray(scheduleJson.scheduleItems)) {
          for (const item of scheduleJson.scheduleItems) {
            if (item.day && item.day.toLowerCase() === dayName) {
              const itemStart = timeToMinutes(item.startTime);
              const itemEnd = timeToMinutes(item.endTime);
              const resStart = timeToMinutes(startTime);
              const resEnd = timeToMinutes(endTime);

              if (resStart < itemEnd && resEnd > itemStart) {
                throw new ValidationError('Classroom is scheduled for a course during this time');
              }
            }
          }
        }
      }
    }

    // Create reservation (status defaults to 'pending' if user is not admin)
    const status = req.user.role === 'admin' ? 'approved' : 'pending';
    const approvedBy = req.user.role === 'admin' ? userId : null;
    const approvedAt = req.user.role === 'admin' ? new Date() : null;

    console.log('Creating reservation:', {
      classroomId,
      userId,
      date,
      startTime,
      endTime,
      purpose,
      status,
      userRole: req.user.role
    });

    const reservation = await ClassroomReservation.create({
      classroomId,
      userId,
      date,
      startTime,
      endTime,
      purpose,
      status,
      approvedBy,
      approvedAt
    }, { transaction: t });

    console.log('Reservation created with ID:', reservation.id);

    await t.commit();
    console.log('Transaction committed');

    // Reload with associations
    const createdReservation = await ClassroomReservation.findByPk(reservation.id, {
      include: [
        { model: Classroom, as: 'classroom' },
        { model: User, as: 'user', attributes: ['id', 'fullName', 'email'] }
      ]
    });

    console.log('Sending response with reservation:', createdReservation.id);
    res.status(201).json(createdReservation);
  } catch (error) {
    // Only rollback if transaction is still active
    if (t && !t.finished) {
      await t.rollback();
    }
    console.error('Create reservation error:', error);
    next(error);
  }
};

/**
 * Get list of reservations with filters
 */
exports.listReservations = async (req, res, next) => {
  try {
    const { date, classroomId, userId, status } = req.query;
    const where = {};

    if (date) {
      where.date = date;
    }

    if (classroomId) {
      where.classroomId = classroomId;
    }

    // If user is not admin, only show their own reservations
    if (req.user.role !== 'admin') {
      where.userId = req.user.id;
    } else if (userId) {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    const reservations = await ClassroomReservation.findAll({
      where,
      include: [
        { model: Classroom, as: 'classroom' },
        { model: User, as: 'user', attributes: ['id', 'fullName', 'email'] },
        { model: User, as: 'approver', attributes: ['id', 'fullName', 'email'], required: false }
      ],
      order: [['date', 'ASC'], ['startTime', 'ASC']]
    });

    res.json(reservations);
  } catch (error) {
    console.error('List reservations error:', error);
    next(error);
  }
};

/**
 * Approve a reservation (Admin only)
 */
exports.approveReservation = async (req, res, next) => {
  const t = await db.sequelize.transaction();
  try {
    const { id } = req.params;
    const approverId = req.user.id;

    const reservation = await ClassroomReservation.findByPk(id, { transaction: t });

    if (!reservation) {
      await t.rollback();
      throw new NotFoundError('Reservation not found');
    }

    if (reservation.status !== 'pending') {
      await t.rollback();
      throw new ValidationError(`Cannot approve reservation with status: ${reservation.status}`);
    }

    // Check for conflicts again (in case something changed)
    const conflictingReservation = await ClassroomReservation.findOne({
      where: {
        id: { [Op.ne]: id },
        classroomId: reservation.classroomId,
        date: reservation.date,
        status: 'approved',
        [Op.or]: [
          {
            [Op.and]: [
              { startTime: { [Op.lte]: reservation.startTime } },
              { endTime: { [Op.gt]: reservation.startTime } }
            ]
          },
          {
            [Op.and]: [
              { startTime: { [Op.lt]: reservation.endTime } },
              { endTime: { [Op.gte]: reservation.endTime } }
            ]
          },
          {
            [Op.and]: [
              { startTime: { [Op.gte]: reservation.startTime } },
              { endTime: { [Op.lte]: reservation.endTime } }
            ]
          }
        ]
      },
      transaction: t
    });

    if (conflictingReservation) {
      await t.rollback();
      throw new ValidationError('Cannot approve: conflicting reservation exists');
    }

    await reservation.update({
      status: 'approved',
      approvedBy: approverId,
      approvedAt: new Date()
    }, { transaction: t });

    await t.commit();

    // Reload with associations
    const updatedReservation = await ClassroomReservation.findByPk(id, {
      include: [
        { model: Classroom, as: 'classroom' },
        { model: User, as: 'user', attributes: ['id', 'fullName', 'email'] },
        { model: User, as: 'approver', attributes: ['id', 'fullName', 'email'] }
      ]
    });

    res.json(updatedReservation);
  } catch (error) {
    await t.rollback();
    console.error('Approve reservation error:', error);
    next(error);
  }
};

/**
 * Reject a reservation (Admin only)
 */
exports.rejectReservation = async (req, res, next) => {
  const t = await db.sequelize.transaction();
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const approverId = req.user.id;

    const reservation = await ClassroomReservation.findByPk(id, { transaction: t });

    if (!reservation) {
      await t.rollback();
      throw new NotFoundError('Reservation not found');
    }

    if (reservation.status !== 'pending') {
      await t.rollback();
      throw new ValidationError(`Cannot reject reservation with status: ${reservation.status}`);
    }

    await reservation.update({
      status: 'rejected',
      approvedBy: approverId,
      approvedAt: new Date(),
      rejectionReason: rejectionReason || 'Rejected by administrator'
    }, { transaction: t });

    await t.commit();

    // Reload with associations
    const updatedReservation = await ClassroomReservation.findByPk(id, {
      include: [
        { model: Classroom, as: 'classroom' },
        { model: User, as: 'user', attributes: ['id', 'fullName', 'email'] },
        { model: User, as: 'approver', attributes: ['id', 'fullName', 'email'] }
      ]
    });

    res.json(updatedReservation);
  } catch (error) {
    await t.rollback();
    console.error('Reject reservation error:', error);
    next(error);
  }
};

/**
 * Cancel a reservation (User or Admin)
 */
exports.cancelReservation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const reservation = await ClassroomReservation.findByPk(id);

    if (!reservation) {
      throw new NotFoundError('Reservation not found');
    }

    // Users can only cancel their own reservations, admins can cancel any
    if (reservation.userId !== userId && req.user.role !== 'admin') {
      throw new ValidationError('You can only cancel your own reservations');
    }

    if (reservation.status === 'cancelled') {
      throw new ValidationError('Reservation is already cancelled');
    }

    // Check if reservation date is in the past
    const reservationDate = new Date(reservation.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (reservationDate < today) {
      throw new ValidationError('Cannot cancel past reservations');
    }

    await reservation.update({ status: 'cancelled' });

    res.json({ message: 'Reservation cancelled successfully', reservation });
  } catch (error) {
    console.error('Cancel reservation error:', error);
    next(error);
  }
};

/**
 * Helper function to convert time string to minutes
 */
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1] || 0);
}

