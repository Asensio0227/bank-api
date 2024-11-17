const Notification = require('../models/notficationModel');
const { Expo } = require('expo-server-sdk');

const retrieveNotificationHistory = async (req, res) => {
  const notifications = await Notification.find({
    userId: req.user.userId,
  }).sort({ createdAt: -1 });

  if (!Expo.isExpoPushToken(notificatons.expoPushToken)) {
    throw new CustomError.BadRequestError('Invalid Expo push token');
  }
  res.status(StatusCodes.OK).json({ notifications });
};

module.exports = retrieveNotificationHistory;
