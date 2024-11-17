const mongoose = require('mongoose');

const roomModel = new mongoose.Schema(
  {
    participantsArray: {
      type: Array,
      required: true,
    },
    participants: {
      type: Array,
      required: true,
    },
    lastMessage: {
      type: Object,
      required: true,
    },
    status: {
      type: String,
      enum: ['online', 'offline'],
      default: 'offline',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Room', roomModel);
