const Room = require('../models/RoomModel');
const customError = require('../errors');
const { StatusCodes } = require('http-status-codes');
const createQueryFilters = require('../utils/queryFilters');

const createRoom = async (req, res) => {
  const { participants, participantsArray } = req.body;

  if (!participants || !participantsArray) {
    throw new customError.BadRequestError('Please provide all values');
  }

  const existingRoom = await Room.findOne({
    participantsArray: { $all: participantsArray },
  });

  if (existingRoom) {
    return res.status(StatusCodes.CREATED).json({ room: existingRoom });
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
    .json({ message: 'Room created successfully.', room: newRoom });
};

const retrieveSingleRoom = async (req, res) => {
  const room = await Room.findOne({ _id: req.params.id });
  if (!room)
    throw new customError.BadRequestError(`No room with id: ${req.params.id}`);
  res.status(StatusCodes.OK).json({ room });
};

const retrieveAllUserRooms = async (req, res) => {
  const rooms = await Room.find({
    participantsArray: { $in: [req.user.email] },
  })
    .sort({ 'lastMessage.createdAt': -1 })
    .populate({
      path: 'userId',
      select: 'firstName lastName expoToken email avatar',
    });
  res.status(StatusCodes.OK).json({ rooms });
};

const updateRoom = async (req, res) => {
  const { id } = req.params;
  const rooms = await Room.findByIdAndUpdate(
    id,
    { ...req.body, user: req.user.userId },
    {
      new: true,
      runValidators: true,
    }
  );

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
  const { search } = req.query;
  const queryObject = {};
  if (search) {
    queryObject.participantsArray = { $regex: search, $options: 'i' };
  }
  const { skip, limit } = createQueryFilters(req);
  const rooms = await Room.find(queryObject)
    .sort('-createdAt')
    .skip(skip)
    .limit(limit)
    .populate({
      path: 'userId',
      select: 'firstName lastName expoToken email  avatar',
    });
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
