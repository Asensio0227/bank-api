const { StatusCodes } = require('http-status-codes');

const errorHandleMiddleware = (err, req, res, next) => {
  let customError = {
    statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    msg: err.message || 'Something went wrong try again later!',
  };

  if (err.name === 'ValidationError') {
    customError.msg = Object.values(err.errors)
      .map((item) => item.message)
      .join(',');
    customError.statusCode = 400;
  }

  if (err.code && err.code === 11000) {
    customError.msg = `Duplicate value enter for ${Object.keys(
      err.keyValue
    )} field, choose another value`;
    customError.statusCode = 400;
  }

  if (err.name === 'CastError') {
    customError.msg = `No user found with id : ${err.value}`;
    customError.statusCode = 404;
  }

  return res.status(customError.statusCode).json({ msg: customError.msg });
};

module.exports = errorHandleMiddleware;
