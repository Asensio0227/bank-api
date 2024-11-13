const CustomError = require('./custom');
const { StatusCodes } = require('http-status-codes');

class UnauthenticatedError extends CustomError {
  constructor(message) {
    super(message);
    this.statuscode = StatusCodes.UNAUTHORIZED;
  }
}

module.exports = UnauthenticatedError;
