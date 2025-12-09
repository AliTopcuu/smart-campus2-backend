const { ForbiddenError } = require('../utils/errors');

const authorizeRole = (...allowedRoles) => (req, _res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return next(new ForbiddenError('Insufficient permissions'));
  }
  return next();
};

module.exports = authorizeRole;

