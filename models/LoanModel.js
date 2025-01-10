const mongoose = require('mongoose');
const validator = require('validator');

const LoanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: [true, 'Please provide your email address'],
      validate: {
        validator: validator.isEmail,
        message: 'Please provide your email address',
      },
    },
    dob: { type: String, required: true },
    physicalAddress: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    loanAmount: { type: Number, required: true },
    interestRate: { type: Number, default: 15 },
    totalAmount: { type: Number, default: 0 },
    remainingBalance: { type: Number, default: 0 },
    startDate: { type: Date },
    startDate: { type: Date },
    description: {
      type: String,
    },
    payments: [
      {
        month: { type: Number },
        paymentAmount: { type: Number },
        datePaid: { type: Date },
      },
    ],
    loanTerm: { type: Number, required: true },
    loanType: {
      type: String,
      enum: ['short-term', 'medium-term', 'long-term'],
      required: true,
    },
    monthlyPayment: { type: Number },
    status: {
      type: String,
      enum: ['active', 'paid', 'defaulted', 'review'],
      default: 'review',
    },
    applicationStatus: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    employmentStatus: {
      type: String,
      enum: ['employed', 'self-employed', 'unemployed', 'retired'],
      default: 'self-employed',
    },
    totalAmountPaid: { type: Number },
    income: { type: Number },
    creditScore: { type: Number },
    debtToIncomeRatio: { type: Number },
    disbursementDate: { type: Number },
    collateralType: { type: String, trim: true },
    collateralValue: { type: Number },
    accountNumber: { type: Number, required: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Loan', LoanSchema);
