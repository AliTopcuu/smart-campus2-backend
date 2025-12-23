const courseService = require('../services/courseService');
const db = require('../models');
const { Classroom } = db;
const { ValidationError, NotFoundError } = require('../utils/errors');
const { Op } = require('sequelize');

const list = async (req, res, next) => {
  try {
    const result = await courseService.list(req.query);
    res.json(result.data || result);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const course = await courseService.getById(req.params.id);
    res.json(course);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const result = await courseService.create(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const result = await courseService.update(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await courseService.remove(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getClassrooms = async (req, res, next) => {
  try {
    const classrooms = await Classroom.findAll({
      order: [['building', 'ASC'], ['roomNumber', 'ASC']]
    });
    res.json(classrooms);
  } catch (error) {
    next(error);
  }
};

const createClassroom = async (req, res, next) => {
  try {
    const { building, roomNumber, capacity, featuresJson, latitude, longitude } = req.body;

    if (!building || !roomNumber || !capacity) {
      return next(new ValidationError('Building, roomNumber, and capacity are required'));
    }

    // Check if classroom already exists
    const existing = await Classroom.findOne({
      where: { building, roomNumber }
    });

    if (existing) {
      return next(new ValidationError('Classroom with this building and room number already exists'));
    }

    const classroom = await Classroom.create({
      building,
      roomNumber,
      capacity,
      featuresJson: featuresJson || null,
      latitude: latitude || null,
      longitude: longitude || null
    });

    res.status(201).json(classroom);
  } catch (error) {
    next(error);
  }
};

const updateClassroom = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { building, roomNumber, capacity, featuresJson, latitude, longitude } = req.body;

    const classroom = await Classroom.findByPk(id);
    if (!classroom) {
      return next(new NotFoundError('Classroom not found'));
    }

    // Check if new building/roomNumber combination already exists (if changed)
    if (building && roomNumber && (building !== classroom.building || roomNumber !== classroom.roomNumber)) {
      const existing = await Classroom.findOne({
        where: { building, roomNumber, id: { [Op.ne]: id } }
      });

      if (existing) {
        return next(new ValidationError('Classroom with this building and room number already exists'));
      }
    }

    await classroom.update({
      building: building || classroom.building,
      roomNumber: roomNumber || classroom.roomNumber,
      capacity: capacity !== undefined ? capacity : classroom.capacity,
      featuresJson: featuresJson !== undefined ? featuresJson : classroom.featuresJson,
      latitude: latitude !== undefined ? latitude : classroom.latitude,
      longitude: longitude !== undefined ? longitude : classroom.longitude
    });

    res.json(classroom);
  } catch (error) {
    next(error);
  }
};

const deleteClassroom = async (req, res, next) => {
  try {
    const { id } = req.params;

    const classroom = await Classroom.findByPk(id);
    if (!classroom) {
      return next(new NotFoundError('Classroom not found'));
    }

    // Check if classroom is used in any sections or reservations
    const sectionsCount = await db.CourseSection.count({ where: { classroomId: id } });
    const reservationsCount = await db.ClassroomReservation.count({ where: { classroomId: id } });

    if (sectionsCount > 0 || reservationsCount > 0) {
      return next(new ValidationError(`Cannot delete classroom. It is used in ${sectionsCount} sections and ${reservationsCount} reservations.`));
    }

    await classroom.destroy();
    res.json({ message: 'Classroom deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  getClassrooms,
  createClassroom,
  updateClassroom,
  deleteClassroom
};
