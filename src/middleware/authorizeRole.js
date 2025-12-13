const { ForbiddenError } = require('../utils/errors');

const authorizeRole = (...roles) => {
  // Handle both: authorizeRole(['admin']) and authorizeRole('admin', 'faculty')
  let allowedRoles;
  if (roles.length === 1 && Array.isArray(roles[0])) {
    allowedRoles = roles[0]; // authorizeRole(['admin', 'faculty'])
  } else {
    allowedRoles = roles; // authorizeRole('admin', 'faculty')
  }
  
  return (req, _res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('User not authenticated'));
    }
    
    const userRole = req.user.role;
    const isAllowed = allowedRoles.includes(userRole);
    
    // Debug logging
    console.log('[AuthorizeRole]', {
      userEmail: req.user.email,
      userRole: userRole,
      allowedRoles: allowedRoles,
      isAllowed: isAllowed,
      rolesParam: roles
    });
    
    if (!isAllowed) {
      return next(new ForbiddenError(`Insufficient permissions. Required roles: ${allowedRoles.join(', ')}, Your role: ${userRole}`));
    }
    
    return next();
  };
};

module.exports = authorizeRole;

