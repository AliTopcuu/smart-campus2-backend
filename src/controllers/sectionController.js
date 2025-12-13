const sectionService = require('../services/sectionService');

const list = async (req, res, next) => {
  try {
    const sections = await sectionService.list(req.query);
    res.json(sections);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const section = await sectionService.getById(req.params.id);
    res.json(section);
  } catch (error) {
    next(error);
  }
};

const mySections = async (req, res, next) => {
  try {
    const sections = await sectionService.mySections(req.user.id);
    res.json(sections);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const result = await sectionService.create(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const result = await sectionService.update(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  list,
  getById,
  mySections,
  create,
  update
};
