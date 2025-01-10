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
const imageUpload = require('../utils/cloudinary');

const getAllUsers = async (req, res) => {
  const { sort, search, roles, banned } = req.query;
  const queryObject = {};

  if (roles && roles.trim() !== 'all') {
    queryObject.roles = roles;
  }

  if (banned) {
    queryObject.banned = banned;
  }

  if (search) {
    queryObject['$or'] = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { ideaNumber: { $regex: search, $options: 'i' } },
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
  const user = await User.findOne({ _id: req.user.userId });
  checkPermissions(req.user, user._id);
  if (req.file) {
    try {
      const fileImage = formatImage(req.file);
      const { url, thumbnailUrl, id } = await imageUpload(fileImage);
      newUser.thumbnailUrl = thumbnailUrl;
      newUser.avatar = url;
      newUser.avatarPublicId = id;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
    }
  }

  user.avatar = newUser.avatar;
  user.avatarPublicId = newUser.avatarPublicId;
  user.thumbnailUrl = newUser.thumbnailUrl;
  user.dob = newUser.dob;
  user.phoneNumber = newUser.phoneNumber;
  user.physicalAddress = newUser.physicalAddress;
  user.email = newUser.email;
  user.lastName = newUser.lastName;
  user.firstName = newUser.firstName;
  user.ideaNumber = newUser.ideaNumber;
  await user.save();

  if (req.file && user.avatarPublicId) {
    await cloudinary.uploader.destroy(user.avatarPublicId);
  }

  const tokenUser = createTokenUser(user);
  attachCookiesToResponse({ res, user: tokenUser });
  res.status(StatusCodes.OK).json({ user });
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
  });

  if (!user) {
    throw new CustomError.NotFoundError('No user found.');
  }

  user.banned = banned;
  user.roles = roles;
  await user.save();

  res.status(StatusCodes.OK).json({ user });
};

const deleteUser = async (req, res) => {
  const user = await User.findOneAndDelete({
    _id: req.params.id,
  });

  if (!user) {
    throw new CustomError.NotFoundError(`No user with id : ${req.params.id}`);
  }
  res.status(StatusCodes.OK).json({ msg: 'user deleted successfully!' });
};

const getAllAssistant = async (req, res) => {
  const { sort } = req.query;
  const sortKeys = 'lastName';
  const { sortKey, skip, limit } = createQueryFilters(req, sort, sortKeys);
  let user;
  if (req.user.roles === 'user') {
    user = await User.find({ roles: 'assistant' })
      .select('-password')
      .sort(sortKey)
      .skip(skip)
      .limit(limit);
  } else if (req.user.roles === 'assistant') {
    user = await User.find({ roles: 'user' })
      .select('-password')
      .sort(sortKey)
      .skip(skip)
      .limit(limit);
  }
  const totalUsers = await User.countDocuments({ roles: 'assistant' });
  const numbOfPages = Math.ceil(totalUsers / limit);
  res.status(StatusCodes.OK).json({ user, numbOfPages });
};

module.exports = {
  getAllUsers,
  showCurrentUser,
  getSingleUser,
  updateUser,
  updateUserPassword,
  updateUserStatus,
  deleteUser,
  getAllAssistant,
};
