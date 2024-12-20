const CustomError = require('../errors');

const checkPermissions = (requestUser, resourceUserId) => {
  if (
    requestUser.roles === 'admin' ||
    requestUser.roles === 'member' ||
    requestUser.roles === 'assistant'
  )
    return;
  if (requestUser.userId === resourceUserId.toString()) return;
  throw new CustomError.UnAuthorized('Not authorized to access this route.');
};

module.exports = checkPermissions;
