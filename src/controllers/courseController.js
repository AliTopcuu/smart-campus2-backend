const courseService = require('../services/courseService');

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

module.exports = {
  list,
  getById,
  create,
  update,
  remove
};
