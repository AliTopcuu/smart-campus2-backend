const authorizeRole = require('../../src/middleware/authorizeRole');
const { ForbiddenError } = require('../../src/utils/errors');

describe('authorizeRole Middleware - Unit Tests', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      user: null,
    };
    res = {};
    next = jest.fn();
  });

  it('should call next() when user has allowed role', () => {
    req.user = { role: 'admin' };
    const middleware = authorizeRole('admin', 'faculty');

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should call next() with ForbiddenError when user role is not allowed', () => {
    req.user = { role: 'student' };
    const middleware = authorizeRole('admin', 'faculty');

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0].message).toBe('Insufficient permissions');
  });

  it('should call next() with ForbiddenError when user is null', () => {
    req.user = null;
    const middleware = authorizeRole('admin');

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    expect(next).toHaveBeenCalledTimes(1);
  });
});

