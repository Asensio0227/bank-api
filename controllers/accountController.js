const { StatusCodes } = require('http-status-codes');

const Account = require('../models/AccountModel');
const CustomError = require('../errors');

const createAccount = async (req, res) => {
  const account = await Account.create(req.body);
  res.status(StatusCodes.OK).json({ account });
};

const linkExistingAccount = async (req, res) => {
  req.body.userId = req.user.userId;
  const account = await Account.findOne({
    accountNumber: req.body.accountNumber,
  });
  res.status(StatusCodes.OK).json({ account });
};

const getAllAccounts = async (req, res) => {
  const accounts = await Account.find({});
  res.status(StatusCodes.OK).json({ accounts, length: accounts.length });
};

const getAllUserAccounts = async (req, res) => {
  const account = await Account.find({ userid: req.userId });
  res.status(StatusCodes.OK).json({ account, length: account.length });
};

const getSingleAccount = async (req, res) => {
  const account = await Account.findOne({ _id: req.params.id });

  if (!account) {
    throw new CustomError.NotFoundError(
      `No account with id : ${req.params.id}`
    );
  }

  res.status(StatusCodes.OK).json({ account });
};

const updateAccount = async (req, res) => {
  const { id: accountId } = req.params;

  const account = await Account.findOneAndUpdate({ _id: accountId }, req.body, {
    new: true,
    runValidators: true,
  });

  if (!account) {
    throw new CustomError.NotFoundError(`No account with id : ${accountId}`);
  }

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

const getBalance = async (req, res) => {
  res.status(StatusCodes.CREATED).json({ msg: 'get Balance' });
};

const getAllTransactions = async (req, res) => {
  res.status(StatusCodes.CREATED).json({ msg: 'get Balance' });
};

module.exports = {
  createAccount,
  getAllAccounts,
  getAllUserAccounts,
  getSingleAccount,
  deleteAccount,
  updateAccount,
  linkExistingAccount,
};
