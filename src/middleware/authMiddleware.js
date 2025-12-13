const db = require('../models');
const { UnauthorizedError } = require('../utils/errors');
const { verifyAccessToken } = require('../utils/jwt');

const authenticate = async (req, _res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return next(new UnauthorizedError('Access token is required'));
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await db.User.findByPk(payload.sub);

    if (!user) {
      return next(new UnauthorizedError('User not found'));
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(new UnauthorizedError('Invalid or expired access token'));
  }
};

module.exports = authenticate;

