const { StatusCodes } = require('http-status-codes');
// models
const Transaction = require('../models/TransactionModel');
const Account = require('../models/AccountModel');
// errors
const CustomError = require('../errors');
const rateLimit = require('../utils/cashLimit');
const { checkPermissions } = require('../utils');
const createQueryFilters = require('../utils/queryFilters');
const { incrementTransaction } = require('../utils/audit');
const StatementModel = require('../models/StatementModel');

const depositTransactions = async (req, res) => {
  const { accountId } = req.body;

  const isValidAccount = await Account.findOne({
    _id: accountId,
  });

  if (!isValidAccount) {
    throw new CustomError.NotFoundError(`No account found for ${accountId}`);
  }
  req.body.accountNumber = isValidAccount.accountNumber;
  const amount = Number(Math.round(req.body.amount * 100));
  const charges = Number(Math.round(0.0125 * amount));
  const transactionFee = charges;
  const depositAmount = transactionFee - req.body.amount;
  const initialBalance = isValidAccount.balance;
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
  const amount = Number(Math.round(req.body.amount * 100));
  const charges = Number(Math.round(0.0125 * amount));
  const transactionFee = charges;
  const initialBalance = isValidAccount.balance - transactionFee;
  const withDrawalAmount = amount;
  req.body.userId = req.user.userId;
  req.body.transactionCharges = transactionFee;
  if (initialBalance < withDrawalAmount) {
    const failedTransaction = await Transaction.create({
      ...req.body,
      type: 'debit',
      amount: withDrawalAmount,
      status: 'failed',
      transactionType: 'withdrawal',
      description: 'Insufficient funds!',
    });
    return res.status(StatusCodes.CREATED).json({ msg: 'Insufficient funds!' });
  }
  const newBalance = initialBalance - withDrawalAmount;

  await rateLimit(req.body.amount, isValidAccount.overdraftLimit, req.body);

  await Account.updateOne(
    { _id: accountId },
    { $set: { balance: newBalance } }
  );

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
  const accountId = req.params.id;
  const isValidAccount = await Account.findOne({ _id: accountId });

  if (!isValidAccount) {
    throw new CustomError.NotFoundError('Account not found');
  }
  checkPermissions(req.user, isValidAccount.userId);
  req.body.accountNumber = isValidAccount.accountNumber;
  const amount = Number(Math.round(req.body.amount * 100));
  const charges = Number(Math.round(0.0125 * amount));
  const transactionFee = charges;
  const initialBalance = isValidAccount.balance - transactionFee;
  const withDrawalAmount = amount;

  req.body.userId = req.user.userId;
  req.body.transactionCharges = transactionFee;
  if (initialBalance + transactionFee < withDrawalAmount) {
    await Transaction.create({
      ...req.body,
      type: 'debit',
      amount: withDrawalAmount,
      status: 'failed',
      accountId,
      description: 'Insufficient funds!',
    });
    res.status(StatusCodes.CREATED).json({ msg: 'Insufficient funds!' });
    return;
  }
  const newBalance = initialBalance - withDrawalAmount;
  const acc = await Account.findOne({
    accountNumber: req.body.toAccountNumber,
  });
  const currentBalance = acc.balance;
  const amountToAdd = req.body.amount * 100;
  const Balance = currentBalance + amountToAdd;

  const limit = rateLimit(amount, isValidAccount.overdraftLimit, req, res);
  const writes = Account.updateOne(
    { _id: acc._id },
    { $set: { balance: Balance } }
  );
  const doc = Account.updateOne(
    { _id: accountId },
    { $set: { balance: newBalance } }
  );
  await Promise.all([limit, writes, doc]);
  req.body.status = 'completed';
  req.body.accountId = acc._id;
  req.body.receiverAccId = acc.userId;
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
  const queryObject = {
    $and: [
      {
        $or: [{ userId: req.user.userId }, { receiverAccId: req.user.userId }],
      },
      {
        $or: [
          { accountNumber: accountNumber },
          { toAccountNumber: accountNumber },
        ],
      },
    ],
  };
  if (status && status.trim() !== 'all') {
    queryObject.status = status;
  }
  if (accountType && accountType.trim() !== 'all') {
    queryObject.accountType = accountType;
  }
  if (type && type.trim() !== 'all') {
    queryObject.type = type;
  }
  if (transactionType && transactionType.trim() !== 'all') {
    queryObject.transactionType = transactionType;
  }

  const sortKeys = 'reference';
  const { sortKey, skip, limit } = createQueryFilters(req, sort, sortKeys);
  const transactions = await Transaction.find(queryObject)
    .populate([
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
  // const numOfPages = Math.ceil(totalTransactions / limit)

  const groupedTransactions = transactions.reduce(
    (accumulator, transaction) => {
      const accountId = transaction.accountId.toString();
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
  const transactions = await Transaction.find({
    _id: req.params.id,
    $or: [{ userId: req.user.userId }, { receiverAccId: req.user.userId }],
  }).populate([
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
  const userId =
    transactions[0]?.userId._id ||
    transactions.userId ||
    transactions.userId._id;
  checkPermissions(req.user, userId);
  res.status(StatusCodes.OK).json({ transactions });
};

const getAllTransactions = async (req, res) => {
  const { type, status, accountType, transactionType, sort, search, reversal } =
    req.query;
  let queryObject = {};
  if (status && status.trim() !== 'all') {
    queryObject.status = status;
  }
  if (accountType && accountType.trim() !== 'all') {
    queryObject.accountType = accountType;
  }
  if (type && type.trim() !== 'all') {
    queryObject.type = type;
  }
  if (transactionType && transactionType.trim() !== 'all') {
    queryObject.transactionType = transactionType;
  }
  if (reversal && reversal.trim() !== 'all') {
    queryObject.reversalStatus = reversal;
  }

  if (search) {
    const accountNumberSearch = parseInt(search);
    if (!isNaN(accountNumberSearch)) {
      queryObject = {
        $or: [
          { accountNumber: accountNumberSearch },
          { toAccountNumber: accountNumberSearch },
        ],
      };
    } else {
      console.error('Invalid account number format');
    }
  }
  const sortKeys = 'reference';
  const { sortKey, skip, limit } = createQueryFilters(req, sort, sortKeys);
  const uniqueUsers = await Transaction.aggregate([
    {
      $match: queryObject,
    },
    {
      $group: {
        _id: '$userId',
        transactions: { $push: '$$ROOT' },
      },
    },
    {
      $limit: limit,
    },
    {
      $skip: skip,
    },
  ]);
  const transactionIds = uniqueUsers.flatMap((user) =>
    user.transactions.map((transaction) => transaction._id)
  );

  const transactions = await Transaction.find({
    _id: { $in: transactionIds },
  })
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
    .sort(sortKey);
  const totalTransactions = await Transaction.countDocuments(queryObject);
  const groupedTransactions = transactions.reduce(
    (accumulator, transaction) => {
      const accountNumber =
        transaction.accountId && transaction.accountId.accountNumber;
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
  const uniqueUserCount = Object.keys(groupedTransactions).length;
  const numOfPages = Math.ceil(uniqueUserCount / limit);
  res.status(StatusCodes.OK).json({
    numOfPages,
    totalTransactions,
    transactions: resultArray,
  });
};

const reversalTransaction = async (req, res) => {
  req.body.userId = req.user.userId;
  const id = req.params.id;
  const reversal = await Transaction.findOne({ _id: id });
  checkPermissions(req.user, reversal.userId);

  if (!reversal || reversal.isReversed) {
    throw new CustomError.NotFoundError('Can not reverse transaction!');
  }

  await Transaction.findByIdAndUpdate(
    id,
    { isReversed: true },
    { new: true, runValidators: true }
  );

  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  const amount = reversal.amount;
  const charges = Number(Math.round(0.0125 * amount));
  const transactionFee = charges;
  const currAccount = await Account.findOne({
    accountNumber: reversal.accountNumber,
  });
  currAccount.balance -= transactionFee;

  if (reversal.status !== 'failed' && reversal.createdAt < thirtyMinutesAgo) {
    const transaction = await Transaction.create({
      amount: reversal.amount,
      accountType: reversal.accountType,
      type: 'debit',
      transactionType: 'reversal',
      reference: reversal.reference,
      status: 'completed',
      reversalStatus: 'declined',
      accountNumber: reversal.accountNumber,
      toAccountNumber: reversal.toAccountNumber,
      accountId: reversal.accountId,
      userId: reversal.userId,
      receiverAccId: reversal.receiverAccId,
      location: reversal.location,
      transactionCharges: transactionFee,
      description: 'Reversal not allowed!',
      isReversed: true,
    });
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ msg: 'Reversal not allowed!', transaction });
  }
  const acc = await Account.findOne({ _id: reversal.accountId });

  if (!acc) {
    throw new CustomError.NotFoundError('Account not found!');
  }

  if (acc.balance < amount) {
    const transaction = await Transaction.create({
      amount: reversal.amount,
      accountType: reversal.accountType,
      type: 'debit',
      reversalStatus: 'declined',
      reference: reversal.reference,
      accountNumber: reversal.accountNumber,
      toAccountNumber: reversal.toAccountNumber,
      accountId: reversal.accountId,
      userId: reversal.userId,
      receiverAccId: reversal.receiverAccId,
      location: reversal.location,
      transactionCharges: transactionFee,
      transactionType: 'reversal',
      status: 'completed',
      description: 'Insufficient funds for reversal!',
      isReversed: true,
    });
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ msg: 'Insufficient funds for reversal!', transaction });
  }

  acc.balance -= amount;
  await acc.save();

  const bal = amount - transactionFee;
  currAccount.balance += bal;
  await currAccount.save();

  const newReversal = await Transaction.create({
    type: 'credit',
    transactionType: 'reversal',
    transactionCharges: transactionFee,
    description: 'reversal transaction',
    isReversed: true,
    amount: reversal.amount,
    accountType: reversal.accountType,
    type: 'debit',
    reference: reversal.reference,
    status: 'completed',
    reversalStatus: 'completed',
    accountNumber: reversal.accountNumber,
    toAccountNumber: reversal.toAccountNumber,
    accountId: reversal.accountId,
    userId: reversal.userId,
    receiverAccId: reversal.receiverAccId,
    location: reversal.location,
  });

  res
    .status(StatusCodes.CREATED)
    .json({ msg: 'reversal transaction', newReversal });
};

const retrieveReversalTransaction = async (req, res) => {
  req.body.userId = req.user.userId;
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  const transactions = await Transaction.find({
    createdAt: { $gte: thirtyMinutesAgo },
    status: 'completed',
    isReversed: false,
  }).sort('-createdAt');
  res.status(StatusCodes.OK).json({ transactions });
};

const retrieveBankStatement = async (req, res) => {
  const { startDate, endDate, sort, accountNumber } = req.query;
  if (!startDate || !endDate || !accountNumber) {
    throw new CustomError.BadRequestError('Please provide all values');
  }
  const queryObject = {
    $and: [
      {
        $or: [{ userId: req.user.userId }, { receiverAccId: req.user.userId }],
      },
      {
        $or: [
          { accountNumber: accountNumber },
          { toAccountNumber: accountNumber },
        ],
      },
    ],
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
        select:
          'firstName lastName ideaNumber email phoneNumber avatar physicalAddress',
      },
    ])
    .sort(sortKey);

  if (!transactions) {
    throw new CustomError.NotFoundError(
      'No transactions found for this period.'
    );
  }
  const acc = await Account.find({ accountNumber });
  const totalTransactions = transactions.length;
  const netBalance = acc.length > 0 && incrementTransaction(transactions, acc);
  const state = await StatementModel.create({
    userId: req.user.userId,
    location: '5 commission street johannesburg, south africa',
    accountNumber,
    startDate,
    endDate,
    balance: netBalance,
    transaction: transactions,
  });

  res.status(StatusCodes.CREATED).json({ state });
};

module.exports = {
  depositTransactions,
  withdrawalTransactions,
  transferTransactions,
  retrieveSingleTransactions,
  retrieveTransactions,
  getAllTransactions,
  retrieveBankStatement,
  reversalTransaction,
  retrieveReversalTransaction,
};
