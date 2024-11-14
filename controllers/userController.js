const { StatusCodes } = require('http-status-codes');
const path = require('path');
const User = require('../models/usersModel');
const CustomError = require('../errors');
const { createTokenUser, attachCookiesToResponse } = require('../utils');

const getAllUsers = async (req, res) => {
  const users = await User.find({ roles: { $in: ['user', 'member'] } }).select(
    '-password'
  );
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
  const { banned, roles } = req.body;

  const user = await User.findOne({
    _id: req.params.id,
    roles: { $in: ['user', 'member'] },
  });
  user.banned = banned;
  user.roles = roles;
  await user.save();

  res.status(StatusCodes.OK).json({ user });
};

const deleteUser = async (req, res) => {
  const user = await User.findOneAndDelete({
    _id: req.params.id,
    roles: 'user',
  });

  if (!user) {
    throw new CustomError.NotFoundError(`No user with id : ${req.params.id}`);
  }
  res.status(StatusCodes.OK).json({ msg: 'deleteUser' });
};

const uploadImageAccount = async (req, res) => {
  if (!req.files) {
    throw new CustomError.BadRequestError('No file uploaded');
  }

  const file = req.files.image;

  if (!file.mimetype.startsWith('image/')) {
    throw new CustomError.BadRequestError('Invalid image type');
  }

  const maxSize = 1024 * 1024;

  if (file.size > maxSize) {
    throw new CustomError('Please upload image smaller than 1MB');
  }

  const imagePath = path.join(__dirname, '../public/uploads/' + `${file.name}`);
  await file.mv(imagePath);
  res.status(StatusCodes.OK).json({ image: `/uploads/${file.name}` });
};

module.exports = {
  getAllUsers,
  showCurrentUser,
  getSingleUser,
  updateUser,
  updateUserPassword,
  updateUserStatus,
  deleteUser,
  uploadImageAccount,
};
