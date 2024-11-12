const CustomError = require('./custom');
const { StatusCodes } = require('http-status-codes');

class UnAuthorized extends CustomError {
  constructor(message) {
    super(message);
    this.statuscode = StatusCodes.FORBIDDEN;
  }
}

module.exports = UnAuthorized;
