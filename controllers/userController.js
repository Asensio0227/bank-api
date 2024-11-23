const { StatusCodes } = require('http-status-codes');
const cloudinary = require('cloudinary').v2;

const User = require('../models/usersModel');
const CustomError = require('../errors');
const {
  createTokenUser,
  attachCookiesToResponse,
  checkPermissions,
} = require('../utils');
const createQueryFilters = require('../utils/queryFilters');
const { formatImage } = require('../middleware/multerMiddleware');

const getAllUsers = async (req, res) => {
  const { sort, search, roles, banned } = req.query;
  const queryObject = {
    roles: { $in: ['user', 'member'] },
  };

  if (roles && roles !== 'all') {
    queryObject.roles = roles;
  }

  if (banned) {
    queryObject.banned = true;
  }

  if (search) {
    queryObject['$or'] = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { IdeaNumber: { $regex: search, $options: 'i' } },
    ];
  }

  const sortKeys = 'lastName';
  const { sortKey, skip, limit } = createQueryFilters(req, sort, sortKeys);
  const users = await User.find(queryObject)
    .select('-password')
    .sort(sortKey)
    .skip(skip)
    .limit(limit);
  const totalUsers = await User.countDocuments(queryObject);
  const numbOfPages = Math.ceil(totalUsers / limit);

  res.status(StatusCodes.OK).json({ users, totalUsers, numbOfPages });
};

const getSingleUser = async (req, res) => {
  const user = await User.findOne({ _id: req.params.id }).select('-password');

  if (!user) {
    throw new CustomError.NotFoundError(`No user with id : ${req.params.id}`);
  }
  checkPermissions(req.user, user._id);

  res.status(StatusCodes.OK).json({ user });
};

const showCurrentUser = async (req, res) => {
  const user = await User.findOne({ _id: req.user.userId }).select(
    '-password -isVerified -verificationToken -verified '
  );
  const userWithoutPassword = user.toJSON();
  res.status(StatusCodes.OK).json({ userWithoutPassword });
};

const updateUser = async (req, res) => {
  const newUser = { ...req.body };
  delete newUser.password;
  delete newUser.roles;

  if (!newUser) {
    throw new CustomError.BadRequestError('Please provide all values');
  }

  if (req.file) {
    const fileImage = formatImage(req.file);
    const response = await cloudinary.uploader.upload(fileImage);
    const { secure_url, url, public_id } = response;
    newUser.thumbnailUrl = url;
    newUser.avatar = secure_url;
    newUser.avatarPublicId = public_id;
  }
  const user = await User.findOne({ _id: req.user.userId });
  checkPermissions(req.user, user._id);
  const updateUser = await User.findByIdAndUpdate(
    req.user.userId,
    newUser
  ).select('-password -isVerified -verificationToken -verified ');

  if (req.file && updateUser.avatarPublicId) {
    await cloudinary.uploader.destroy(updateUser.avatarPublicId);
  }

  const tokenUser = createTokenUser(user);
  attachCookiesToResponse({ res, user: tokenUser });
  res.status(StatusCodes.OK).json({ user: updateUser });
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

  checkPermissions(req.user, user._id);
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
  checkPermissions(req.user, user._id);
  res.status(StatusCodes.OK).json({ msg: 'deleteUser' });
};

module.exports = {
  getAllUsers,
  showCurrentUser,
  getSingleUser,
  updateUser,
  updateUserPassword,
  updateUserStatus,
  deleteUser,
};
