const { StatusCodes } = require('http-status-codes');
// model
const Loan = require('../models/LoanModel');
const User = require('../models/usersModel');
const Account = require('../models/AccountModel');
const Transaction = require('../models/TransactionModel');
// errors
const CustomError = require('../errors');
const {
  processLoanPayment,
  processTransactionPayment,
  calculateMonthlyPayment,
} = require('../utils/loan');
const { checkPermissions } = require('../utils');

// admin
const approveLoanApplication = async (req, res) => {
  const { monthlyPayment } = req.body;
  const loan = await Loan.findById(req.params.id);

  if (!loan) {
    throw new CustomError.NotFoundError(`No loan found for ${req.params.id}`);
  }
  checkPermissions(req.user, loan.userId);
  loan.status = 'active';
  loan.applicationStatus = 'accepted';
  loan.totalAmount = loan.loanAmount;
  loan.remainingBalance = loan.loanAmount;
  loan.monthlyPayment = Math.round(monthlyPayment * 100);

  await loan.save();
  res.status(StatusCodes.CREATED).json({ loan });
};

const rejectLoanApplication = async (req, res) => {
  const loan = await Loan.findByIdAndUpdate(
    req.params.id,
    {
      applicationStatus: 'rejected',
      status: 'defaulted',
    },
    { new: true, runValidators: true }
  );
  res.status(StatusCodes.CREATED).json({ loan });
};

const getLoanApplications = async (req, res) => {
  const { applicationStatus, status, loanType, loanAmount, search, sort } =
    req.query;
  const queryObject = { userId: req.user.userId };
  if (applicationStatus) queryObject.applicationStatus = applicationStatus;
  if (status && status !== 'all ') queryObject.status = status;
  if (loanType && loanType !== 'all ') queryObject.loanType = loanType;
  if (search) {
    queryObject.name = { $regex: search, $options: 'i' };
    queryObject.phoneNumber = { $regex: search, $options: 'i' };
    queryObject.email = { $regex: search, $options: 'i' };
  }
  let result = Loan.find(queryObject).populate([
    {
      path: 'userId',
      select: 'firstName lastName ideaNumber email phoneNumber avatar',
    },
  ]);
  if (loanAmount) queryObject.loanAmount = loanAmount;
  if (sort === 'oldest') {
    result = result.sort('createdAt');
  }
  if (sort === 'latest') {
    result = result.sort('-createdAt');
  }
  if (sort === 'z-a') {
    result = result.sort('-name');
  }
  if (sort === 'a-z') {
    result = result.sort('name');
  }

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * 10;
  result = result.skip(skip).limit(limit);
  checkPermissions(req.user, loans.userId);
  const loans = await result;
  const groupLoans = loans.reduce((acc, loan) => {
    const userId = loan.userId._id.toString();
    if (!acc[userId]) {
      acc[userId] = { userId: loan.userId, loans: [] };
    }
    acc[userId].loans.push(loan);
    return acc;
  }, {});
  const resultArray = Object.values(groupLoans);
  const totalLoans = await Loan.countDocuments(queryObject);
  const uniqueUserCount = Object.keys(groupLoans).length;
  const numOfPages = Math.ceil(uniqueUserCount / limit);
  res
    .status(StatusCodes.CREATED)
    .json({ loans: resultArray, totalLoans, numOfPages });
};

const getSingleLoanApplications = async (req, res) => {
  const loans = await Loan.findOne({ _id: req.params.id });
  checkPermissions(req.user, loans.userId);
  res.status(StatusCodes.CREATED).json({ loans });
};

const calculateTotalPayableLoanPerMonth = async (req, res) => {
  const { amount, interestRate, loanTerm } = req.body;
  const loanAmount = Math.round(amount * 100);
  const loanData = { loanAmount, interestRate, loanTerm };

  if (!loanAmount || !loanTerm || !interestRate) {
    throw new CustomError.BadRequestError('Please provide all values');
  }

  const monthlyPayment = calculateMonthlyPayment(loanData);
  req.body.userId = req.user.userId;
  res
    .status(StatusCodes.OK)
    .json({ monthlyPayment, message: 'Loan created successfully!' });
};

// user
const applyForLoan = async (req, res) => {
  const user = await User.findOne({ _id: req.user.userId });
  let fName = `${user.firstName}, ${user.lastName}`;

  req.body.email = user.email;
  req.body.phoneNumber = user.phoneNumber;
  req.body.physicalAddress = user.physicalAddress;
  req.body.dob = user.dob;
  req.body.name = fName;
  req.body.userId = req.user.userId;
  const loanAmount = Math.round(req.body.loanAmount * 100);
  await Loan.create({ ...req.body, loanAmount });

  res.status(StatusCodes.CREATED).json({ msg: ' loan application in review' });
};

const retrieveLoanDetails = async (req, res) => {
  const loan = await Loan.findOne({ _id: req.params.id });

  if (!loan) {
    throw new CustomError.BadRequestError('No loan found');
  }
  checkPermissions(req.user, loan.userId);
  res.status(StatusCodes.CREATED).json({ loan });
};

const loanPaymentBalance = async (req, res) => {
  const loan = await Loan.findOne({ _id: req.params.id });

  if (!loan) {
    throw new CustomError.BadRequestError('No loan found');
  }
  checkPermissions(req.user, loan.userId);
  const loanAmount = loan.loanAmount;
  const loanTerm = loan.loanTerm;
  const interestRate = loan.interestRate;
  const loadData = { loanTerm, interestRate, loanAmount };
  const monthlyInterestRate = calculateMonthlyPayment(loadData);
  const paymentCount = loan.payments.length;

  if (interestRate === 0) {
    const loanAmount = loan.loanAmount;
    const loanTerm = loan.loanTerm;
    const monthlyPayment = loanAmount / loanTerm;

    res
      .status(StatusCodes.CREATED)
      .json({ monthlyPayment, totalOfPayments: paymentCount });
    return;
  }

  res.status(StatusCodes.CREATED).json({
    monthlyPayment: monthlyInterestRate,
    balance: loan.remainingBalance,
    totalOfPayments: paymentCount,
  });
};

const loanPayment = async (req, res) => {
  const { amount } = req.body;
  let monthlyPayment = Math.round(amount * 100);
  const acc = await Account.findOne({ accountNumber: req.body.accountNumber });

  if (!acc) {
    throw new CustomError.NotFoundError('No not found!');
  }
  if (acc.balance < monthlyPayment) {
    throw new CustomError.BadRequestError('Insufficient funds!');
  }

  acc.balance -= monthlyPayment;
  req.body.userId = req.user.userId;
  const transaction = processTransactionPayment(req, acc._id);
  const loan = processLoanPayment(req);
  const account = acc.save();
  const data = await Promise.all([account, transaction, loan]);
  res.status(StatusCodes.CREATED).json({
    data,
  });
};

const getAllLoan = async (req, res) => {
  const { applicationStatus, status, loanType, loanAmount, search, sort } =
    req.query;
  const queryObject = { userId: req.user.userId };
  if (applicationStatus) queryObject.applicationStatus = applicationStatus;
  if (status && status !== 'all ') queryObject.status = status;
  if (loanType && loanType !== 'all ') queryObject.loanType = loanType;
  if (search) {
    queryObject.name = { $regex: search, $options: 'i' };
    queryObject.phoneNumber = { $regex: search, $options: 'i' };
    queryObject.email = { $regex: search, $options: 'i' };
  }
  let result = Loan.find(queryObject).populate([
    {
      path: 'userId',
      select: 'firstName lastName ideaNumber email phoneNumber avatar',
    },
  ]);
  if (loanAmount) {
    const loanAmountNumber = Number(loanAmount);
    result = result.where('loanAmount').gte(loanAmountNumber);
  }
  if (sort === 'latest') {
    result = result.sort('-createdAt');
  }
  if (sort === 'oldest') {
    result = result.sort('createdAt');
  }
  if (sort === 'a-z') {
    result = result.sort('name');
  }
  if (sort === 'z-a') {
    result = result.sort('-name');
  }
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  result = result.skip(skip).limit(limit);
  checkPermissions(req.user, loans.userId);
  const loans = await result;
  const totalLoans = await Loan.countDocuments(queryObJect);
  const numOfPage = Math.ceil(totalLoans / limit);

  res.status(StatusCodes.CREATED).json({ loans, totalLoans, numOfPage });
};

module.exports = {
  // user
  applyForLoan,
  retrieveLoanDetails,
  loanPayment,
  getAllLoan,
  loanPaymentBalance,
  // admin || member
  calculateTotalPayableLoanPerMonth,
  getLoanApplications,
  approveLoanApplication,
  rejectLoanApplication,
  getSingleLoanApplications,
};
