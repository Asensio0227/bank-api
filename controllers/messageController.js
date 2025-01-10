const Message = require('../models/MessageModel');
const Room = require('../models/RoomModel');
const customError = require('../errors');
const { StatusCodes } = require('http-status-codes');

const createMsg = async (req, res) => {
  const { roomId, text } = req.body;
  const message = await Message.create({ text, user: req.user.userId, roomId });
  lastMessage = message;
  const room = await Room.findOne({
    _id: roomId,
  });
  room.lastMessage = lastMessage;
  await room.save();
  res.status(StatusCodes.CREATED).json({ message, room });
};

const retrieveAllMsg = async (req, res) => {
  const messages = await Message.find({ roomId: req.params.roomId })
    .sort('-createdAt')
    .populate({
      path: 'user',
      select: 'firstName lastName expoToken email  avatar',
    });
  const totalMessages = await Message.countDocuments({
    roomId: req.params.roomId,
  });
  res.status(StatusCodes.OK).json({ totalMessages, messages });
};
const retrieveAdminAllMsg = async (req, res) => {
  const messages = await Message.find({ roomId: req.params.roomId })
    .sort('-createdAt')
    .populate({
      path: 'user',
      select: 'firstName lastName expoToken email  avatar',
    });
  const totalMessages = await Message.countDocuments({
    roomId: req.params.roomId,
  });
  res.status(StatusCodes.OK).json({ totalMessages, messages });
};

const deleteMsg = async (req, res) => {
  const { id } = req.params;
  await Message.findByIdAndDelete(id);
  res.status(StatusCodes.OK).json({ msg: 'Message deleted!' });
};

const updateMsg = async (req, res) => {
  const message = await Message.updateMany(
    {
      roomId: req.params.roomId,
      'user._id': { $ne: req.user.userId },
    },
    { $set: { isRead: true } }
  );
  res
    .status(StatusCodes.OK)
    .json({ msg: 'Message updated successfully!', message });
};

module.exports = {
  createMsg,
  retrieveAllMsg,
  deleteMsg,
  retrieveAdminAllMsg,
  updateMsg,
};
