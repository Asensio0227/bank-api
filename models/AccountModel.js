const { required } = require('joi');
const mongoose = require('mongoose');

const accountModel = new mongoose.Schema(
  {
    BanKName: {
      type: String,
      default: 'CBC',
    },
    branchCode: {
      type: Number,
      required: [true, 'Please provide your branch code'],
      unique: true,
    },
    accountType: {
      type: String,
      enum: ['savings', 'checking', 'loan'],
      required: [true, 'Please provide your account type'],
      default: 'savings',
    },
    accountNumber: {
      type: Number,
      required: [true, 'Please provide your account number'],
      unique: true,
    },
    balance: {
      type: Number,
      default: 0.0,
    },
    interestRate: {
      type: Number,
    },
    overdraftLimit: {
      type: Number,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Account', accountModel);
