const attendanceService = require('../services/attendanceService');

const createSession = async (req, res, next) => {
  try {
    const result = await attendanceService.createSession(req.user.id, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const closeSession = async (req, res, next) => {
  try {
    const result = await attendanceService.closeSession(req.params.sessionId, req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getMySessions = async (req, res, next) => {
  try {
    const result = await attendanceService.getMySessions(req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getActiveSessions = async (req, res, next) => {
  try {
    const result = await attendanceService.getActiveSessions(req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getSessionById = async (req, res, next) => {
  try {
    const result = await attendanceService.getSessionById(req.params.sessionId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const checkIn = async (req, res, next) => {
  try {
    const result = await attendanceService.checkIn(req.params.sessionId, req.user.id, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const getMyAttendance = async (req, res, next) => {
  try {
    const result = await attendanceService.getMyAttendance(req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getSessionReport = async (req, res, next) => {
  try {
    const result = await attendanceService.getSessionReport(req.params.sessionId, req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSession,
  closeSession,
  getMySessions,
  getActiveSessions,
  getSessionById,
  checkIn,
  getMyAttendance,
  getSessionReport
};

