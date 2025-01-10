const mongoose = require('mongoose');

const statementSchema = new mongoose.Schema(
  {
    transaction: {
      type: Array,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    accountNumber: {
      type: Number,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    balance: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Statement', statementSchema);
