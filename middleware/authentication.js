// model
const Token = require('../models/TokenModel');
// errors
const CustomError = require('../errors');
// utils
const { isTokenValid, attachCookiesToResponse } = require('../utils');

const authenticateUser = async (req, res, next) => {
  const { refreshToken, accessToken } = req.signedCookies;

  try {
    if (accessToken) {
      const payload = isTokenValid(accessToken);
      const { roles, fName, userId, avatar, email, expoToken } = payload.user;
      const testUser = userId === '67399fb5106d0964e3ccdeb5';
      req.user = { roles, fName, testUser, userId, avatar, email, expoToken };
      return next();
    }

    const payload = isTokenValid(refreshToken);
    const existingToken = await Token.findOne({
      user: payload.user.userId,
      refreshToken: payload.refreshToken,
    });

    if (!existingToken || !existingToken?.isValid) {
      throw new CustomError.UnauthenticatedError('Authentication invalid!');
    }

    attachCookiesToResponse({
      res,
      user: payload.user,
      refreshToken: existingToken.refreshToken,
    });

    const { roles, fName, userId, avatar, email, expoToken } = payload.user;
    const testUser = userId === '67399fb5106d0964e3ccdeb5';
    req.user = { roles, fName, testUser, userId, avatar, email, expoToken };
    next();
  } catch (error) {
    console.log(error);
  }
};

const authorizedPermissions = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.roles)) {
      throw new CustomError.UnAuthorized('Unauthorized to access this route');
    }
    next();
  };
};

const checkForTestUser = (req, res, next) => {
  if (req.user.testUser)
    throw new CustomError.BadRequestError('Demo user. Read Only!');
  next();
};

module.exports = {
  authenticateUser,
  authorizedPermissions,
  checkForTestUser,
};
