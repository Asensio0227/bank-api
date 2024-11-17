const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    expoPushToken: { type: String, require: true },
    message: { type: String, require: true },
    status: {
      type: String,
      enum: ['sent', 'default', 'failed'],
      default: 'default',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      require: true,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
