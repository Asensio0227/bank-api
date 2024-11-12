const mongoose = require('mongoose');

const transactionModel = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: [true, 'Please provide amount'],
    },
    type: {
      type: String,
      enum: ['debit', 'credit'],
      required: [true, 'Please provide account type'],
    },
    reference: {
      type: String,
      required: [true, 'Please provide reference'],
    },
    description: {
      type: String,
      required: [true, 'Please provide description'],
    },
    accountNumber: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },
    toAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: false,
    },
    status: {
      type: String,
      enum: ['completed', 'pending', 'failed'],
      default: 'completed',
    },
    transactionType: {
      type: String,
      enum: ['deposit', 'withdrawal', 'transfer'],
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionModel);
