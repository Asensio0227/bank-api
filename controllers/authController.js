const { StatusCodes } = require('http-status-codes');
const usersModel = require('../models/usersModel');

const register = async (req, res) => {
  const user = await usersModel.create(req.body);
  res.status(StatusCodes.CREATED).json({ user });
};

const login = async (req, res) => {
  res.status(StatusCodes.OK).json({ msg: 'login' });
};

const logout = async (req, res) => {
  res.cookies('token', 'logout', {
    httpOnly: true,
    expires: new Date(Date.now()),
  });

  res.status(StatusCodes.OK).json({ msg: 'logging out...' });
};

const forgotPassword = async (req, res) => {
  res.status(StatusCodes.OK).json({ msg: 'forgot passsword' });
};

module.exports = {
  register,
  login,
  logout,
  forgotPassword,
};
