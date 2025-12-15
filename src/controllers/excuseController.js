const excuseService = require('../services/excuseService');

const submitExcuseRequest = async (req, res, next) => {
  try {
    // Multer'dan gelen dosya bilgisini al
    const documentUrl = req.file ? req.file.path : null;
    const result = await excuseService.submitExcuseRequest(req.user.id, {
      sessionId: parseInt(req.body.sessionId),
      reason: req.body.reason,
      documentUrl
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const getMyExcuseRequests = async (req, res, next) => {
  try {
    const result = await excuseService.getMyExcuseRequests(req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getExcuseRequestsForInstructor = async (req, res, next) => {
  try {
    const result = await excuseService.getExcuseRequestsForInstructor(req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const approveExcuseRequest = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const result = await excuseService.approveExcuseRequest(
      req.params.requestId,
      req.user.id,
      notes
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const rejectExcuseRequest = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const result = await excuseService.rejectExcuseRequest(
      req.params.requestId,
      req.user.id,
      notes
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getSessionsForExcuseRequest = async (req, res, next) => {
  try {
    const { sectionId, date } = req.query;
    if (!sectionId || !date) {
      return res.status(400).json({ message: 'sectionId and date are required' });
    }
    const result = await excuseService.getSessionsForExcuseRequest(
      req.user.id,
      parseInt(sectionId),
      date
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitExcuseRequest,
  getMyExcuseRequests,
  getExcuseRequestsForInstructor,
  approveExcuseRequest,
  rejectExcuseRequest,
  getSessionsForExcuseRequest
};
