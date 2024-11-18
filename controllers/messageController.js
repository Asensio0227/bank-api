const Message = require('../models/MessageModel');
const Room = require('../models/RoomModel');
const customError = require('../errors');
const { StatusCodes } = require('http-status-codes');

const createMsg = async (req, res) => {
  const { roomId, text } = req.body;
  const message = await Message.create({ text, user: req.user.userId });
  lastMessage = message;
  const room = await Room.findOne({
    _id: roomId,
  });
  room.lastMessage = lastMessage;
  await room.save();
  res.status(StatusCodes.CREATED).json({ message, room });
};

const retrieveAllMsg = async (req, res) => {
  const messages = await Message.find({ user: req.user.userId }).sort(
    '-createdAt'
  );
  const totalMessages = await Message.countDocuments({ user: req.user.userId });
  res.status(StatusCodes.OK).json({ totalMessages, messages });
};

const retrieveMsg = async (req, res) => {
  const messages = await Message.find({}).sort('-createdAt');
  const totalMessages = await Message.countDocuments({});
  res.status(StatusCodes.OK).json({ totalMessages, messages });
};

const deleteMsg = async (req, res) => {
  const { id } = req.params;
  await Message.findByIdAndDelete(id);
  res.status(StatusCodes.OK).json({ msg: 'Message deleted!' });
};

module.exports = {
  createMsg,
  retrieveAllMsg,
  deleteMsg,
  retrieveMsg,
};
