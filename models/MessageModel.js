const mongoose = require('mongoose');

const messagesModel = new mongoose.Schema(
  {
    text: {
      type: String,
    },
    avatar: {
      type: String,
    },
    user: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
      require: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messagesModel);
