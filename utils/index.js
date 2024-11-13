const checkPermissions = require('./checkPermissions');
const createTokenUser = require('./create-token');
const hashString = require('./createHash');
const { createJWT, isTokenValid, attachCookiesToResponse } = require('./jwt');
const sendEmail = require('./sendEmail');
const sendResetPassword = require('./sendResetPassword');
const sendVerificationEmail = require('./sendVerificationEmail');
module.exports = {
  createJWT,
  isTokenValid,
  attachCookiesToResponse,
  createTokenUser,
  checkPermissions,
  sendEmail,
  sendResetPassword,
  sendVerificationEmail,
  hashString,
};
