const { StatusCodes } = require('http-status-codes');

const Account = require('../models/AccountModel');
const User = require('../models/usersModel');
const CustomError = require('../errors');
const { checkPermissions } = require('../utils');
const createQueryFilters = require('../utils/queryFilters');

const createAccount = async (req, res) => {
  req.body.createdBy = req.user.userId;
  const user = await User.findOne({ ideaNumber: req.body.ideaNumber });
  const fName = `${user.firstName} ${user.lastName}`;
  const account = await Account.create({
    ...req.body,
    accountHolderName: fName,
    userId: user._id,
  });
  res.status(StatusCodes.OK).json({ account });
};

const linkExistingAccount = async (req, res) => {
  const account = await Account.findOne({
    accountNumber: req.body.accountNumber,
    userId: req.user.userId,
  });
  checkPermissions(req.user, account.userId);

  res.status(StatusCodes.OK).json({ account });
};

const getAllAccounts = async (req, res) => {
  const { accountType, sort, search } = req.query;
  const queryObject = {};

  if (search) {
    queryObject.accountHolderName = { $regex: search, $options: 'i' };
  }

  if (accountType && accountType.trim() !== 'all') {
    queryObject.accountType = accountType;
  }

  const sortKeys = 'accountHolderName';
  const { sortKey, skip, limit } = createQueryFilters(req, sort, sortKeys);
  const accounts = await Account.find(queryObject)
    .populate([
      {
        path: 'userId',
        select: 'firstName lastName ideaNumber email phoneNumber avatar',
      },
      {
        path: 'createdBy',
        select: 'firstName lastName ideaNumber email phoneNumber avatar',
      },
    ])
    .sort(sortKey)
    .skip(skip)
    .limit(limit);
  const totalAccount = await Account.countDocuments(queryObject);

  const groupAccounts = accounts.reduce((acc, account) => {
    const userId = account.userId._id.toString();
    if (!acc[userId]) {
      acc[userId] = { userId: account.userId, accounts: [] };
    }
    acc[userId].accounts.push(account);
    return acc;
  }, {});

  const finalAccountsArray = Object.values(groupAccounts);
  const uniqueUserCount = Object.keys(groupAccounts).length;
  const numbOfPage = Math.ceil(uniqueUserCount / limit);

  res
    .status(StatusCodes.OK)
    .json({ accounts: finalAccountsArray, totalAccount, numbOfPage });
};

const getAllUserAccounts = async (req, res) => {
  const account = await Account.find({ userId: req.user.userId });
  res.status(StatusCodes.OK).json({ account, length: account.length });
};

const getSingleAccount = async (req, res) => {
  const account = await Account.findOne({
    _id: req.params.id,
    userId: req.user.userId,
  });

  if (!account) {
    throw new CustomError.NotFoundError(
      `No account with id : ${req.params.id}`
    );
  }
  checkPermissions(req.user, account.userId);

  res.status(StatusCodes.OK).json({ account });
};

const updateAccount = async (req, res) => {
  const { id: accountId } = req.params;

  const account = await Account.findOneAndUpdate(
    { _id: accountId, userId: req.user.userId },
    req.body,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!account) {
    throw new CustomError.NotFoundError(`No account with id : ${accountId}`);
  }
  checkPermissions(req.user, account.userId);

  res.status(StatusCodes.OK).json({ account });
};

const updateUserAccount = async (req, res) => {
  const { id: accountId } = req.params;
  const { overdraftLimit, accountNumber } = req.body;

  const account = await Account.findOneAndUpdate(
    { _id: accountId },
    { overdraftLimit, accountNumber, userId: req.user.userId },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!account) {
    throw new CustomError.NotFoundError(`No account with id : ${accountId}`);
  }
  checkPermissions(req.user, account.userId);

  res.status(StatusCodes.OK).json({ account });
};

const deleteAccount = async (req, res) => {
  const { id: accountId } = req.params;

  const account = await Account.findByIdAndDelete(accountId);

  if (!account) {
    throw new CustomError.NotFoundError(`No account with id : ${accountId}`);
  }
  res
    .status(StatusCodes.OK)
    .json({ msg: 'Account has been deleted successfully!' });
};

module.exports = {
  createAccount,
  getAllAccounts,
  getAllUserAccounts,
  getSingleAccount,
  deleteAccount,
  updateAccount,
  linkExistingAccount,
  updateUserAccount,
};
