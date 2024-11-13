const BadRequestError = require('./bad-request');
const CustomError = require('./custom');
const NotFoundError = require('./not-found');
const UnauthenticatedError = require('./unauthenticated');
const UnAuthorized = require('./unauthorized');

module.exports = {
  CustomError,
  BadRequestError,
  NotFoundError,
  UnauthenticatedError,
  UnAuthorized,
};
