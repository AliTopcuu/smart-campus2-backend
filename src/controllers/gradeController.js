const gradeService = require('../services/gradeService');

const myGrades = async (req, res, next) => {
  try {
    const { year, semester } = req.query;
    const filters = {};
    if (year !== undefined && year !== null && year !== '') {
      filters.year = year;
    }
    if (semester !== undefined && semester !== null && semester !== '') {
      filters.semester = semester;
    }
    const result = await gradeService.myGrades(req.user.id, filters);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const transcript = async (req, res, next) => {
  try {
    const transcript = await gradeService.transcript(req.user.id);
    res.json(transcript);
  } catch (error) {
    next(error);
  }
};

const transcriptPdf = async (req, res, next) => {
  try {
    const result = await gradeService.transcriptPdf(req.user.id);
    // For now, return JSON. PDF generation can be implemented later
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const saveGrades = async (req, res, next) => {
  try {
    const { sectionId, grades } = req.body;
    const result = await gradeService.saveGrades(sectionId, req.user.id, { grades });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  myGrades,
  transcript,
  transcriptPdf,
  saveGrades
};
