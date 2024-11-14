const mongoose = require('mongoose');

const transactionModel = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: [true, 'Please provide amount'],
    },
    accountType: {
      type: String,
      enum: ['savings', 'checking', 'loan'],
      required: [true, 'Please provide your account type'],
      default: 'savings',
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
      type: Number,
      required: [true, 'Please provide account number'],
    },
    toAccountNumber: {
      type: Number,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['completed', 'pending', 'failed', 'canceled'],
      default: 'pending',
    },
    transactionCharges: {
      type: Number,
      required: true,
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
