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
  const depositAmount = transactionFee - req.body.amount;
  const newBalance = initialBalance + depositAmount;
  console.log(depositAmount, newBalance);
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
    const failedTransaction = await Transaction.create({
      ...req.body,
      type: 'debit',
      amount: withDrawalAmount,
      status: 'failed',
      transactionType: 'withdrawal',
    });
    return res.status(StatusCodes.CREATED).json({ failedTransaction });
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
  const { accountId } = req.params;
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
    const failedTransaction = await Transaction.create({
      ...req.body,
      type: 'debit',
      amount: withDrawalAmount,
      status: 'failed',
    });
    return res.status(StatusCodes.CREATED).json({ failedTransaction });
  }
  const newBalance = initialBalance - withDrawalAmount;

  const acc = await Account.findOne({
    accountNumber: req.body.toAccountNumber,
  });
  const currentBalance = acc.balance;
  const amountToAdd = req.body.amount * 100;
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
  req.body.status = acc.userId || acc.userId._id;
  const transaction = await Transaction.create({
    ...req.body,
    type: 'debit',
    amount,
    transactionType: 'transfer',
  });
  res.status(StatusCodes.CREATED).json({ transaction });
};

const retrieveTransactions = async (req, res) => {
  const { accountNumber } = req.params;
  const { type, status, accountType, transactionType, sort } = req.query;
  const queryObject = { userId: req.user.userId, accountNumber };
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
        select: 'firstName lastName ideaNumber email phoneNumber avatar',
      },
      {
        path: 'toUserAccountNumber',
        select: 'firstName lastName ideaNumber email phoneNumber avatar',
      },
    ])
    .sort(sortKey)
    .skip(skip)
    .limit(limit);
  const totalTransactions = await Transaction.countDocuments(queryObject);
  // const numOfPages = Math.ceil(totalTransactions / limit);

  const groupedTransactions = transactions.reduce(
    (accumulator, transaction) => {
      const accountId = transaction.accountId._id.toString();
      checkPermissions(req.user, transaction.userId._id);
      if (!accumulator[accountId]) {
        accumulator[accountId] = [];
      }

      accumulator[accountId].push(transaction);

      return accumulator;
    },
    {}
  );
  const resultArray = Object.keys(groupedTransactions).map((accountId) => ({
    accountId,
    transactions: groupedTransactions[accountId],
  }));
  const uniqueUserCount = Object.keys(groupedTransactions).length;
  const numOfPages = Math.ceil(uniqueUserCount / limit);

  res
    .status(StatusCodes.CREATED)
    .json({ transactions: resultArray, numOfPages, totalTransactions });
};

const retrieveSingleTransactions = async (req, res) => {
  req.body.userId = req.user.userId;
  const transactions = await Transaction.find({ _id: req.params.id }).populate([
    {
      path: 'accountId',
      select: 'accountNumber branchCode accountHolderName',
    },
    {
      path: 'userId',
      select: 'firstName lastName ideaNumber email phoneNumber avatar',
    },
    {
      path: 'toUserAccountNumber',
      select: 'firstName lastName ideaNumber email phoneNumber avatar',
    },
  ]);

  if (!transactions) {
    throw new CustomError.NotFoundError('No transactions found');
  }
  const userId = transactions[0].userId._id;
  checkPermissions(req.user, userId);
  res.status(StatusCodes.OK).json({ transactions });
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
        select: 'firstName lastName ideaNumber email phoneNumber avatar',
      },
      {
        path: 'toUserAccountNumber',
        select: 'firstName lastName ideaNumber email phoneNumber avatar',
      },
    ])
    .sort(sortKey)
    .skip(skip)
    .limit(limit);
  const totalTransactions = await Transaction.countDocuments(queryObject);
  const numOfPages = Math.ceil(totalTransactions / limit);
  checkPermissions(req.user, transactions.userId);

  const groupTransactions = transactions.reduce((acc, transaction) => {
    const key = `${transaction.accountNumber}_${
      transaction.createdAt.toISOString().split('T')[0]
    }`;
    if (!acc[key]) {
      acc[key] = [transaction];
    } else {
      acc[key].push(transaction);
    }
    return acc;
  }, {});
  const groupedTransactions = transactions.reduce(
    (accumulator, transaction) => {
      const accountNumber = transaction.accountId.accountNumber;
      if (!accumulator[accountNumber]) {
        accumulator[accountNumber] = [];
      }

      accumulator[accountNumber].push(transaction);

      return accumulator;
    },
    {}
  );
  const resultArray = Object.keys(groupedTransactions).map((accountNumber) => ({
    accountNumber,
    transactions: groupedTransactions[accountNumber],
  }));
  const resultedCreatedAtArray = Object.values(groupTransactions);
  res.status(StatusCodes.OK).json({
    transactions: resultArray,
    numOfPages,
    totalTransactions,
    resultedCreatedAtArray,
  });
};

const retrieveBankStatement = async (req, res) => {
  const { startDate, endDate, sort, accountNumber } = req.query;
  if (!startDate || !endDate || !accountNumber) {
    throw new CustomError.BadRequestError('Please provide all values');
  }
  const queryObject = {
    userId: req.user.userId,
    accountNumber,
    createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
  };

  const { sortKey } = createQueryFilters(req, sort);

  const transactions = await Transaction.find(queryObject)
    .populate([
      {
        path: 'accountId',
        select: 'accountNumber branchCode accountHolderName',
      },
      {
        path: 'userId',
        select: 'firstName lastName ideaNumber email phoneNumber avatar',
      },
    ])
    .sort(sortKey);

  if (!transactions) {
    throw new CustomError.NotFoundError(
      'No transactions found for this period.'
    );
  }
  res.status(StatusCodes.OK).json({ transactions });
};

module.exports = {
  depositTransactions,
  withdrawalTransactions,
  transferTransactions,
  retrieveSingleTransactions,
  retrieveTransactions,
  getAllTransactions,
  retrieveBankStatement,
};
