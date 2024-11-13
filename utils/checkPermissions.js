const CustomError = require('../errors');

const checkPermissions = (requestUser, resourceUserId) => {
  if (requestUser.roles === 'admin') return;
  if (requestUser.userId === resourceUserId.toString()) return;
  throw new CustomError.UnAuthorized('Not authorized to access this route.');
};

module.exports = checkPermissions;
