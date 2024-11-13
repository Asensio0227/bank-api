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
      req.user = payload.user;
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

    req.user = payload.user;
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

module.exports = {
  authenticateUser,
  authorizedPermissions,
};
