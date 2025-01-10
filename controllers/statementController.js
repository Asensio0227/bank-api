const { StatusCodes } = require('http-status-codes');
const CustomError = require('../errors');
const Account = require('../models/AccountModel');
const Statement = require('../models/StatementModel');
const Transaction = require('../models/TransactionModel');
const { incrementTransaction } = require('../utils/audit');
const createQueryFilters = require('../utils/queryFilters');

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
  const state = await Statement.create({
    userId: req.user.userId,
    location: '5 commission street johannesburg, south africa',
    accountNumber,
    startDate,
    endDate,
    balance: netBalance,
    transaction: transactions,
    totalTransactions,
  });

  res.status(StatusCodes.CREATED).json({ state });
};

const retrieveSingleStatement = async (req, res) => {
  const statement = await Statement.findOne({
    _id: req.params.id,
    userId: req.user.userId,
  }).populate([
    {
      path: 'userId',
      select:
        'firstName lastName ideaNumber email phoneNumber avatar physicalAddress',
    },
  ]);

  if (!statement) {
    throw new CustomError.NotFoundError('No statement found.');
  }
  res.status(StatusCodes.OK).json({ statement });
};

const retrieveAllUserStatement = async (req, res) => {
  const { sort, search } = req.query;
  let queryObject = { userId: req.user.userId };

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

  const sortKeys = 'location';
  const { sortKey, skip, limit } = createQueryFilters(req, sort, sortKeys);
  const statements = await Statement.find(queryObject)
    .populate([
      {
        path: 'userId',
        select:
          'firstName lastName ideaNumber email phoneNumber avatar physicalAddress',
      },
    ])
    .sort(sortKey)
    .skip(skip)
    .limit(limit);

  if (!statements) {
    throw new CustomError.NotFoundError('No statements found.');
  }
  const totalStatement = await Statement.countDocuments(queryObject);
  const numOfPage = Math.ceil(totalStatement / limit);
  res.status(StatusCodes.OK).json({ statements, numOfPage, totalStatement });
};

const retrieveAllStatement = async (req, res) => {
  const { sort, search } = req.query;
  let queryObject = {};

  if (search) {
    const accountNumberSearch = parseInt(search);
    if (!isNaN(accountNumberSearch)) {
      queryObject.accountNumber = accountNumberSearch;
    } else {
      throw new CustomError.BadRequestError('Invalid account number format');
    }
  }

  const sortKeys = 'location';
  const { sortKey, skip, limit } = createQueryFilters(req, sort, sortKeys);
  const uniqueUsers = await Transaction.aggregate([
    {
      $match: queryObject,
    },
    {
      $group: {
        _id: '$userId',
      },
    },
    {
      $limit: limit,
    },
    {
      $skip: skip,
    },
  ]);
  const userIds = uniqueUsers.map((user) => user._id);
  const statements = await Statement.find({
    userId: { $in: userIds },
  })
    .populate([
      {
        path: 'userId',
        select:
          'firstName lastName ideaNumber email phoneNumber avatar physicalAddress',
      },
    ])
    .sort(sortKey);

  if (!statements) {
    throw new CustomError.NotFoundError('No statements found.');
  }
  const groupedTransactions = statements.reduce((accumulator, statement) => {
    const accountNumber = statement && statement.accountNumber;
    if (!accumulator[accountNumber]) {
      accumulator[accountNumber] = [];
    }

    accumulator[accountNumber].push(statement);

    return accumulator;
  }, {});
  const resultArray = Object.keys(groupedTransactions).map((accountNumber) => ({
    accountNumber,
    statements: groupedTransactions[accountNumber],
  }));
  const totalStatement = await Statement.countDocuments(queryObject);
  const uniqueStatementCount = Object.keys(groupedTransactions).length;
  const numOfPage = Math.ceil(uniqueStatementCount / limit);
  res
    .status(StatusCodes.OK)
    .json({ statements: resultArray, numOfPage, totalStatement });
};

module.exports = {
  retrieveBankStatement,
  retrieveSingleStatement,
  retrieveAllUserStatement,
  retrieveAllStatement,
};
