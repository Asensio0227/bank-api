const mongoose = require('mongoose');

const roomModel = new mongoose.Schema(
  {
    participantsArray: {
      type: [String],
      required: true,
    },
    participants: {
      type: Array,
      required: true,
    },
    lastMessage: {
      type: Object,
      default: {},
    },
    status: {
      type: String,
      enum: ['online', 'offline'],
      default: 'offline',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Room', roomModel);
