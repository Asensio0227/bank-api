const { StatusCodes } = require('http-status-codes');
const { Expo } = require('expo-server-sdk');
const User = require('../models/usersModel');

const createPushToken = async (req, res) => {
  const user = await User.create({ _id: req.user.userId });

  if (!user) throw new CustomError.BadRequestError('Invalid user!');

  if (!Expo.isExpoPushToken(req.body.expoToken))
    throw new CustomError.BadRequestError('Invalid token');

  user.expoToken = req.body.expoToken;
  await user.save();
  res.status(StatusCodes.CREATED).json({ msg: 'token created' });
};

module.exports = {
  createPushToken,
};
