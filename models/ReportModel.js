const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
    },
    generatedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    accountNumber: {
      type: Number,
      required: [true, 'Please provide your account number'],
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalTransactions: { type: Number, default: 0 },
    totalCredits: { type: Number, default: 0 },
    totalDebit: { type: Number, default: 0 },
    netBalance: { type: Number, default: 0 },
    isAudited: { type: Boolean },
    auditComments: { type: String },
    desc: { type: String, required: [true, 'Please provide reason for audit'] },
    reportStatus: {
      type: String,
      enum: ['draft', 'finalized', 'archived'],
      default: 'draft',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);
