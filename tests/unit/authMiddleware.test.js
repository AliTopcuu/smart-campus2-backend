const authenticate = require('../../src/middleware/authMiddleware');
const { UnauthorizedError } = require('../../src/utils/errors');
const { verifyAccessToken } = require('../../src/utils/jwt');
const db = require('../../src/models');

jest.mock('../../src/utils/jwt');
jest.mock('../../src/models');

describe('authenticate Middleware - Unit Tests', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      headers: {},
    };
    res = {};
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should call next() with UnauthorizedError when no authorization header', async () => {
    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should call next() with UnauthorizedError when authorization header format is invalid', async () => {
    req.headers.authorization = 'InvalidFormat';

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should call next() with UnauthorizedError when token is missing', async () => {
    req.headers.authorization = 'Bearer ';

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should call next() with UnauthorizedError when token verification fails', async () => {
    req.headers.authorization = 'Bearer invalid-token';
    verifyAccessToken.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should call next() with UnauthorizedError when user not found', async () => {
    req.headers.authorization = 'Bearer valid-token';
    verifyAccessToken.mockReturnValue({ sub: '123' });
    db.User.findByPk.mockResolvedValue(null);

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should set req.user and call next() when authentication succeeds', async () => {
    const mockUser = { id: '123', email: 'test@example.com', role: 'student' };
    req.headers.authorization = 'Bearer valid-token';
    verifyAccessToken.mockReturnValue({ sub: '123' });
    db.User.findByPk.mockResolvedValue(mockUser);

    await authenticate(req, res, next);

    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalledWith();
    expect(next).toHaveBeenCalledTimes(1);
  });

});

