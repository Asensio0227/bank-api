const { StatusCodes } = require('http-status-codes');

const sendNotification = async (req, res) => {
  res.status(StatusCodes.CREATED).json({ msg: 'send Notification' });
};

const retrieveNotificationHistory = async (req, res) => {
  res
    .status(StatusCodes.CREATED)
    .json({ msg: 'retrieve Notification History' });
};

module.exports = {
  sendNotification,
  retrieveNotificationHistory,
};
