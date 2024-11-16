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
    },
    accountType: {
      type: String,
      enum: ['savings', 'checking', 'loan'],
      required: [true, 'Please provide your account type'],
      default: 'savings',
    },
    accountHolderName: {
      type: String,
      required: [true, 'Please provide your account holder name'],
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
    overdraftLimit: {
      type: Number,
      default: 1000,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

accountModel.virtual('transaction', {
  ref: 'Transaction',
  localField: '_id',
  foreignField: 'account',
  justOne: false,
});

accountModel.pre('remove', async function (next) {
  await this.model('Transaction').deleteMany({ account: this._id });
});

module.exports = mongoose.model('Account', accountModel);
