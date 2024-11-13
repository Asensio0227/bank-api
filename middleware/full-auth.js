const { isTokenValid } = require('../utils');
const CustomError = require('../errors');

const authenticatedUser = async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startWith('Bearer')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    throw new CustomError.UnauthenticatedError('Authentication invalid!');
  }

  try {
    const payload = isTokenValid(token);

    req.user = {
      userId: payload.user.userId,
      roles: payload.user.roles,
    };

    next();
  } catch (error) {
    console.log(error);
  }
};

const authorizedRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.roles)) {
      throw new CustomError.UnAuthorized('Unauthorized to access this route');
    }
    next();
  };
};

module.exports = { authenticatedUser, authorizedRoles };
