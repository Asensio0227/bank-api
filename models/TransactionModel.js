const mongoose = require('mongoose');

const transactionModel = new mongoose.Schema(
  {
    bank: {
      type: String,
    },
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
    type: {
      type: String,
      enum: ['debit', 'credit'],
      required: [true, 'Please provide type'],
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
    toUserAccountNumber: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
    receiverAccId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    location: {
      type: String,
      required: true,
    },
    isReversed: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['completed', 'pending', 'failed', 'canceled', 'defaulted'],
      default: 'pending',
    },
    reversalStatus: {
      type: String,
      enum: ['completed', 'declined', 'ready'],
      default: 'ready',
    },
    transactionCharges: {
      type: Number,
      required: true,
    },
    transactionType: {
      type: String,
      enum: [
        'deposit',
        'withdrawal',
        'transfer',
        'loan',
        'payment',
        'reversal',
      ],
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionModel);
