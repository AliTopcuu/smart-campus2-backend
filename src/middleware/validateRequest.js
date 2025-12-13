const { ValidationError } = require('../utils/errors');

const validateRequest = (schema) => async (req, _res, next) => {
  try {
    await schema.validate(req.body, { abortEarly: false });
    next();
  } catch (error) {
    if (error.errors) {
      return next(new ValidationError(error.errors.join(', ')));
    }
    return next(error);
  }
};

module.exports = validateRequest;
