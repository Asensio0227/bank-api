const { StatusCodes } = require('http-status-codes');
const User = require('../models/usersModel');
const CustomError = require('../errors');
const { createTokenUser, attachCookiesToResponse } = require('../utils');

const getAllUsers = async (req, res) => {
  const users = await User.find({ roles: 'user' }).select('-password');
  res.status(StatusCodes.OK).json({ users, length: users.length });
};

const getSingleUser = async (req, res) => {
  const user = await User.findOne({ _id: req.params.id }).select('-password');

  if (!user) {
    throw new CustomError.NotFoundError(`No user with id : ${req.params.id}`);
  }
  res.status(StatusCodes.OK).json({ user });
};

const showCurrentUser = async (req, res) => {
  res.status(StatusCodes.OK).json({ user: req.user });
};

const updateUser = async (req, res) => {
  const { email, firstName, lastName, dob } = req.body;

  if (!email || !firstName || !lastName || !dob) {
    throw new CustomError.BadRequestError('Please provide all values');
  }

  const user = await User.findOne({ _id: req.user.userId });

  user.email = email;
  user.firstName = firstName;
  user.lastName = lastName;
  user.dob = dob;

  await user.save();
  const tokenUser = createTokenUser(user);
  attachCookiesToResponse({ res, user: tokenUser });
  res.status(StatusCodes.OK).json({ user: tokenUser });
};

const updateUserPassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new CustomError.BadRequestError(
      'Please provide old and new password'
    );
  }
  const user = await User.findOne({ _id: req.user.userId });
  const isPasswordCorrect = await user.ComparePassword(oldPassword);

  if (!isPasswordCorrect) {
    throw new CustomError.UnauthenticatedError('Invalid credentials!');
  }

  user.password = newPassword;
  await user.save();
  res.status(StatusCodes.OK).json({ msg: 'updateUserPassword' });
};

const updateUserStatus = async (req, res) => {
  const { banned } = req.body;

  const user = await User.findOne({ _id: req.params.id, roles: 'user' });
  user.banned = banned ? false : true;
  await user.save();

  res.status(StatusCodes.OK).json({ msg: 'updateUserStatus' });
};

module.exports = {
  getAllUsers,
  showCurrentUser,
  getSingleUser,
  updateUser,
  updateUserPassword,
  updateUserStatus,
};
