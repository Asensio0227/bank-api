const { StatusCodes } = require('http-status-codes');
// models
const Transaction = require('../models/TransactionModel');
const Account = require('../models/AccountModel');
// errors
const CustomError = require('../errors');
const rateLimit = require('../utils/cashLimit');
const { checkPermissions } = require('../utils');
const createQueryFilters = require('../utils/queryFilters');

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
  const amount = Math.round(req.body.amount * 100);
  const charges = Math.round(0.0125 * amount);
  const transactionFee = charges;
  const depositAmount = req.body.amount - transactionFee;
  const newBalance = initialBalance + depositAmount;
  await Account.updateOne(
    { _id: accountId },
    { $set: { balance: newBalance } }
  );
  req.body.userId = req.user.userId;
  req.body.transactionCharges = transactionFee;
  req.body.status = 'completed';
  const transaction = await Transaction.create({
    ...req.body,
    amount,
    type: 'credit',
    transactionType: 'deposit',
  });
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
  checkPermissions(req.user, isValidAccount.userId);
  req.body.accountNumber = isValidAccount.accountNumber;
  const initialBalance = isValidAccount.balance;
  const amount = Math.round(req.body.amount * 100);
  const charges = Math.round(0.0125 * amount);
  const transactionFee = charges;
  const withDrawalAmount = amount - transactionFee;

  if (initialBalance < withDrawalAmount) {
    throw new CustomError.BadRequestError('Insufficient funds');
  }
  const newBalance = initialBalance - withDrawalAmount;

  await rateLimit(req.body.amount, isValidAccount.overdraftLimit);

  await Account.updateOne(
    { _id: accountId },
    { $set: { balance: newBalance } }
  );

  req.body.userId = req.user.userId;
  req.body.transactionCharges = transactionFee;
  req.body.status = 'completed';
  const transaction = await Transaction.create({
    ...req.body,
    amount,
    type: 'debit',
    transactionType: 'withdrawal',
  });
  res.status(StatusCodes.CREATED).json({ transaction });
};

const transferTransactions = async (req, res) => {
  const { accountId } = req.body;
  const isValidAccount = await Account.findOne({ _id: accountId });

  if (!isValidAccount) {
    throw new CustomError.NotFoundError('Account not found');
  }
  checkPermissions(req.user, isValidAccount.userId);
  req.body.accountNumber = isValidAccount.accountNumber;
  const initialBalance = isValidAccount.balance;
  const amount = Math.round(req.body.amount * 100);
  const charges = Math.round(0.0125 * amount);
  const transactionFee = charges;
  const withDrawalAmount = amount - transactionFee;

  if (initialBalance < withDrawalAmount) {
    throw new CustomError.BadRequestError('Insufficient funds');
  }
  const newBalance = initialBalance - withDrawalAmount;

  const acc = await Account.findOne({
    accountNumber: req.body.toAccountNumber,
  });
  const currentBalance = acc.balance;
  const amountToAdd = req.body.amount;
  const Balance = currentBalance + amountToAdd;

  const limit = rateLimit(amount, isValidAccount.overdraftLimit);

  const writes = Account.updateOne(
    { _id: acc._id },
    { $set: { balance: Balance } }
  );
  const doc = Account.updateOne(
    { _id: accountId },
    { $set: { balance: newBalance } }
  );
  await Promise.all([limit, writes, doc]);
  req.body.userId = req.user.userId;
  req.body.transactionCharges = transactionFee;
  req.body.status = 'completed';
  const transaction = await Transaction.create({
    ...req.body,
    type: 'debit',
    amount,
    transactionType: 'transfer',
  });
  res.status(StatusCodes.CREATED).json({ transaction });
};

const retrieveTransactions = async (req, res) => {
  const { type, status, accountType, transactionType, sort } = req.query;
  const queryObject = { userId: req.user.userId };
  if (status && status !== 'all') {
    queryObject.status = status;
  }
  if (accountType && accountType !== 'all') {
    queryObject.accountType = accountType;
  }
  if (type && type !== 'all') {
    queryObject.type = type;
  }
  if (transactionType && transactionType !== 'all') {
    queryObject.transactionType = transactionType;
  }

  const { sortKey, skip, limit } = createQueryFilters(req, sort);
  const transactions = await Transaction.find(queryObject)
    .populate([
      {
        path: 'accountId',
        select: 'accountNumber branchCode accountHolderName',
      },
      {
        path: 'userId',
        select: 'firstName lastName IdeaNumber email phoneNumber',
      },
    ])
    .sort(sortKey)
    .skip(skip)
    .limit(limit);
  const totalTransactions = await Transaction.countDocuments(queryObject);
  const numOfPages = Math.ceil(totalTransactions / limit);
  checkPermissions(req.user, transactions.userId);

  res
    .status(StatusCodes.CREATED)
    .json({ transactions, numOfPages, totalTransactions });
};

const retrieveSingleTransactions = async (req, res) => {
  req.body.userId = req.user.userId;
  const transactions = await Transaction.find({ _id: req.params.id });

  if (!transactions) {
    throw new CustomError.NotFoundError('No transactions found');
  }
  checkPermissions(req.user, transactions.userId);
  res.status(StatusCodes.CREATED).json({ transactions });
};

const getAllTransactions = async (req, res) => {
  const { type, status, accountType, transactionType, sort } = req.query;
  const queryObject = {};
  if (status && status !== 'all') {
    queryObject.status = status;
  }
  if (accountType && accountType !== 'all') {
    queryObject.accountType = accountType;
  }
  if (type && type !== 'all') {
    queryObject.type = type;
  }
  if (transactionType && transactionType !== 'all') {
    queryObject.transactionType = transactionType;
  }

  const { sortKey, skip, limit } = createQueryFilters(req, sort);
  const transactions = await Transaction.find(queryObject)
    .populate([
      {
        path: 'accountId',
        select: 'accountNumber branchCode accountHolderName',
      },
      {
        path: 'userId',
        select: 'firstName lastName IdeaNumber email phoneNumber',
      },
    ])
    .sort(sortKey)
    .skip(skip)
    .limit(limit);
  const totalTransactions = await Transaction.countDocuments(queryObject);
  const numOfPages = Math.ceil(totalTransactions / limit);
  checkPermissions(req.user, transactions.userId);
  res
    .status(StatusCodes.OK)
    .json({ transactions, numOfPages, totalTransactions });
};

module.exports = {
  depositTransactions,
  withdrawalTransactions,
  transferTransactions,
  retrieveSingleTransactions,
  retrieveTransactions,
  getAllTransactions,
};