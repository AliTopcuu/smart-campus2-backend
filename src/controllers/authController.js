const authService = require('../services/authService');

const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const verifyEmail = async (req, res, next) => {
  try {
    const result = await authService.verifyEmail(req.body.token);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  verifyEmail,
  login,
  getProfile: async (req, res, next) => {
    try {
      const result = await authService.getProfile(req.user.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
  refreshSession: async (req, res, next) => {
    try {
      const result = await authService.refreshSession(req.body.refreshToken);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
  logout: async (req, res, next) => {
    try {
      await authService.logout(req.body.refreshToken);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
  forgotPassword: async (req, res, next) => {
    try {
      const result = await authService.forgotPassword(req.body.email);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
  resetPassword: async (req, res, next) => {
    try {
      const result = await authService.resetPassword({
        token: req.body.token,
        password: req.body.password,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
};

