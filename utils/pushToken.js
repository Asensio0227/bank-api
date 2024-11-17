const { Expo } = require('expo-server-sdk');
const CustomError = require('../errors');
const Notification = require('../models/notficationModel');

const expo = new Expo();
const sendNotification = async (targetExpToken, message, req) => {
  if (!Expo.isExpoPushToken(targetExpToken))
    throw new CustomError.BadRequestError(
      `Invalid expo token: ${targetExpToken}`
    );
  const chunks = expo.chunkPushNotifications([
    { to: targetExpToken, sound: 'default', body: message },
  ]);
  await sendChunks(chunks, message, req);
};

const sendChunks = async (chunks, message, req) => {
  chunks.forEach(async (chunk) => {
    try {
      if (!chunk) {
        throw new CustomError.BadRequestError('Failed to send notifications');
      }

      const tickets = await expo.sendPushNotificationsAsync(chunk);
      await Notification.create({
        expoPushToken: chunk[0].to,
        message,
        userId: req.user.userId,
        status: 'sent',
      });
    } catch (error) {
      console.log('Error sending notification:', error);
      const failedNotification = new Notification({
        expoPushToken: chunk[0].to,
        message,
        status: 'failed',
      });
      await failedNotification.save();
    }
  });
};

const checkNotificationsReceipts = async (receiptIds) => {
  const receipts = await expo.getPushNotificationReceiptsAsync(receiptIds);

  for (let receiptId of receipts) {
    const { status, message } = receiptIds[receiptId];
    // db
  }
};

module.exports = sendNotification;
