const mongoose = requirE('mongoose');

const messagesModel = new mongoose.Schema(
  {
    text,
    userId: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
      require: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messagesModel);
