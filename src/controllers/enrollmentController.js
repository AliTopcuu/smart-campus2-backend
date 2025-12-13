const enrollmentService = require('../services/enrollmentService');

const enroll = async (req, res, next) => {
  try {
    const result = await enrollmentService.enroll(req.user.id, req.body.sectionId);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const drop = async (req, res, next) => {
  try {
    const result = await enrollmentService.drop(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const myCourses = async (req, res, next) => {
  try {
    const courses = await enrollmentService.myCourses(req.user.id);
    res.json(courses);
  } catch (error) {
    next(error);
  }
};

const sectionStudents = async (req, res, next) => {
  try {
    const students = await enrollmentService.sectionStudents(req.params.sectionId);
    res.json(students);
  } catch (error) {
    next(error);
  }
};

const getPendingEnrollments = async (req, res, next) => {
  try {
    const pending = await enrollmentService.getPendingEnrollments(
      req.params.sectionId,
      req.user.id,
      req.user.role // Pass role to allow admin access
    );
    res.json(pending);
  } catch (error) {
    next(error);
  }
};

const approveEnrollment = async (req, res, next) => {
  try {
    const result = await enrollmentService.approveEnrollment(
      req.params.id,
      req.user.id,
      req.user.role // Pass role to allow admin access
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const rejectEnrollment = async (req, res, next) => {
  try {
    const result = await enrollmentService.rejectEnrollment(
      req.params.id,
      req.user.id,
      req.user.role // Pass role to allow admin access
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  enroll,
  drop,
  myCourses,
  sectionStudents,
  getPendingEnrollments,
  approveEnrollment,
  rejectEnrollment
};
