const Room = require('../models/RoomModel');
const customError = require('../errors');
const { StatusCodes } = require('http-status-codes');
const createQueryFilters = require('../utils/queryFilters');

const createRoom = async (req, res) => {
  const { participants, participantsArray } = req.body;

  if (!participants || !participantsArray) {
    throw new customError.BadRequestError('Please provide all values');
  }
  const newRoom = new Room({
    userId: req.user.userId,
    participants,
    participantsArray,
    lastMessage: {},
  });

  await newRoom.save();

  res
    .status(StatusCodes.CREATED)
    .json({ message: 'Room created successfully.', roomId: newRoom._id });
};

const retrieveSingleRoom = async (req, res) => {
  const room = await Room.findOne({ _id: req.params.id });
  if (!room)
    throw new customError.BadRequestError(`No room with id: ${req.params.id}`);
  res.status(StatusCodes.OK).json({ room });
};

const retrieveAllUserRooms = async (req, res) => {
  const rooms = await Room.find({ userId: req.user.userId });
  res.status(StatusCodes.OK).json({ rooms });
};

const updateRoom = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const rooms = await Room.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!rooms) throw new customError(`No room with id : ${req.params.id}`);

  res.status(StatusCodes.OK).json({ rooms });
};

const deleteRoom = async (req, res) => {
  const room = await Room.findOne({ _id: req.params.id });
  if (!room)
    throw new customError.BadRequestError(
      `No room found with id: ${req.params.id}`
    );

  await room.deleteOne();
  res.status(StatusCodes.OK).json({ msg: 'Conversation deleted!' });
};

const retrieveAllRoom = async (req, res) => {
  const { sort, search } = req.query;
  const queryObject = {};
  if (search) {
    queryObject.participantsArray = { $regex: search, $options: 'i' };
  }
  const { sortKey, skip, limit } = createQueryFilters(req, sort);
  const rooms = await Room.find(queryObject)
    .sort(sortKey)
    .skip(skip)
    .limit(limit);
  const totalConversation = await Room.countDocuments(queryObject);
  const numbOfPages = Math.ceil(totalConversation / limit);
  res.status(StatusCodes.OK).json({ totalConversation, numbOfPages, rooms });
};

module.exports = {
  createRoom,
  retrieveAllRoom,
  retrieveAllUserRooms,
  deleteRoom,
  updateRoom,
  retrieveSingleRoom,
};
