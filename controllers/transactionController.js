const { StatusCodes } = require('http-status-codes');
// models
const Transaction = require('../models/TransactionModel');
const Account = require('../models/AccountModel');
// errors
const CustomError = require('../errors');
const rateLimit = require('../utils/cashLimit');

const depositTransactions = async (req, res) => {
  const { accountId } = req.body;

  const isValidAccount = await Account.findOne({
    _id: accountId,
  });

  if (!isValidAccount) {
    throw new CustomError.NotFoundError(`No account found for ${accountId}`);
  }
  req.body.accountNumber = isValidAccount.accountNumber;
  const initialBalance = isValidAccount.balance;
  const charges = 0.0125 * req.body.amount;
  const transactionFee = parseFloat(charges.toFixed(2));
  const depositAmount = req.body.amount - transactionFee;
  const newBalance = initialBalance + depositAmount;
  await Account.updateOne(
    { _id: accountId },
    { $set: { balance: newBalance.toFixed(2) } }
  );
  req.body.userId = req.user.userId;
  req.body.transactionCharges = transactionFee;
  req.body.status = 'completed';
  const transaction = await Transaction.create(req.body);
  res.status(StatusCodes.CREATED).json({ transaction });
};

const withdrawalTransactions = async (req, res) => {
  const { accountId } = req.body;

  if (req.body.amount <= 0) {
    throw new CustomError.BadRequestError('Amount must be greater than zero.');
  }

  const isValidAccount = await Account.findOne({
    _id: accountId,
  });

  if (!isValidAccount) {
    throw new CustomError.NotFoundError(`No account found for ${accountId}`);
  }

  req.body.accountNumber = isValidAccount.accountNumber;
  const initialBalance = isValidAccount.balance;
  const charges = 0.0125 * req.body.amount;
  const transactionFee = parseFloat(charges.toFixed(2));
  const withDrawalAmount = req.body.amount - transactionFee;

  if (initialBalance < withDrawalAmount) {
    throw new CustomError.BadRequestError('Insufficient funds');
  }
  const newBalance = initialBalance - withDrawalAmount;

  await rateLimit(req.body.amount, isValidAccount.overdraftLimit);

  await Account.updateOne(
    { _id: accountId },
    { $set: { balance: newBalance.toFixed(2) } }
  );

  req.body.userId = req.user.userId;
  req.body.transactionCharges = transactionFee;
  req.body.status = 'completed';
  const transaction = await Transaction.create(req.body);
  res.status(StatusCodes.CREATED).json({ transaction });
};

const transferTransactions = async (req, res) => {
  console.log(req.body);
  const { accountId } = req.body;
  const isValidAccount = await Account.findOne({ _id: accountId });

  if (!isValidAccount) {
    throw new CustomError.NotFoundError('Account not found');
  }
  req.body.accountNumber = isValidAccount.accountNumber;
  const initialBalance = isValidAccount.balance;
  const charges = 0.0125 * req.body.amount;
  const transactionFee = parseFloat(charges.toFixed(2));
  const withDrawalAmount = req.body.amount - transactionFee;

  if (initialBalance < withDrawalAmount) {
    throw new CustomError.BadRequestError('Insufficient funds');
  }
  const newBalance = initialBalance - withDrawalAmount;

  const acc = await Account.findOne({
    accountNumber: req.body.toAccountNumber,
  });
  const currentBalance = parseFloat(acc.balance);
  const amountToAdd = parseFloat(req.body.amount);
  const Balance = (currentBalance + amountToAdd).toFixed(2);

  const limit = rateLimit(req.body.amount, isValidAccount.overdraftLimit);

  const writes = Account.updateOne(
    { _id: acc._id },
    { $set: { balance: Balance } }
  );
  const doc = Account.updateOne(
    { _id: accountId },
    { $set: { balance: newBalance.toFixed(2) } }
  );
  await Promise.all([limit, writes, doc]);
  req.body.userId = req.user.userId;
  req.body.transactionCharges = transactionFee;
  req.body.status = 'completed';
  const transaction = await Transaction.create(req.body);
  res.status(StatusCodes.CREATED).json({ transaction });
};

const retrieveTransactions = async (req, res) => {
  const transactions = await Transaction.find({ userId: req.user.userId });
  res
    .status(StatusCodes.CREATED)
    .json({ transactions, length: transactions.length });
};

const retrieveSingleTransactions = async (req, res) => {
  req.body.userId = req.user.userId;
  const transactions = await Transaction.find({ _id: req.params.id });

  if (!transactions) {
    throw new CustomError.NotFoundError('No transactions found');
  }
  res.status(StatusCodes.CREATED).json({ transactions });
};

module.exports = {
  depositTransactions,
  withdrawalTransactions,
  transferTransactions,
  retrieveSingleTransactions,
  retrieveTransactions,
};
