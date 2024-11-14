const { StatusCodes } = require('http-status-codes');
// model
const Loan = require('../models/LoanModel');
const User = require('../models/usersModel');
const Account = require('../models/AccountModel');
const Transaction = require('../models/TransactionModel');
// errors
const CustomError = require('../errors');
const { calculateTotalPayable } = require('../utils/loan');

// admin
const approveLoanApplication = async (req, res) => {
  const loan = await Loan.findById(req.params.id);

  if (!loan) {
    throw new CustomError.NotFoundError(`No loan found for ${req.params.id}`);
  }

  loan.status = 'active';
  loan.applicationStatus = 'accepted';
  loan.totalAmount = loan.loanAmount;
  loan.remainingBalance = loan.loanAmount;

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
  const loans = await Loan.find({});
  res.status(StatusCodes.CREATED).json({ loans, length: loans.length });
};

const getSingleLoanApplications = async (req, res) => {
  const loans = await Loan.findOne({ _id: req.params.id });
  res.status(StatusCodes.CREATED).json({ loans });
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
  await Loan.create(req.body);

  res.status(StatusCodes.CREATED).json({ msg: ' loan application in review' });
};

const retrieveLoanDetails = async (req, res) => {
  const loan = await Loan.findOne({ _id: req.params.id });

  if (!loan) {
    throw new CustomError.BadRequestError('No loan found');
  }

  res.status(StatusCodes.CREATED).json({ loan });
};

const loanPayment = async (req, res) => {
  let { monthlyPayment } = req.body;
  const { loan, totalPayable, monthlyInterestRatePayment } =
    await calculateTotalPayable(monthlyPayment, req);

  if (monthlyInterestRatePayment === 0) {
    monthlyPayment = monthlyPayment;
  } else {
    monthlyPayment = totalPayable;
  }

  (loan.remainingBalance -= monthlyPayment).toFixed(2);
  loan.payments.push({
    month: new Date().getMonth() + 1,
    monthlyPayment,
    datePaid: new Date(),
  });

  if (loan.remainingBalance <= 0) {
    loan.status = 'paid';
    loan.remainingBalance = 0;
    await loan.save();
  }
  const acc = await Account.findOne({ accountNumber: req.body.accountNumber });

  if (!acc) {
    throw new CustomError.NotFoundError('No not found!');
  }

  console.log(`===monthlyPayment===`);
  console.log(monthlyPayment);
  console.log(`===monthlyPayment===`);
  if (acc.balance < monthlyPayment) {
    throw new CustomError.BadRequestError('Insufficient funds!');
  }

  (acc.balance -= monthlyPayment).toFixed(2);
  const charges = 0.0125 * monthlyPayment;
  const transactionFee = parseFloat(charges.toFixed(2));
  req.body.userId = req.user.userId;
  const transaction = await Transaction.create({
    amount: monthlyPayment,
    accountId: acc._id,
    status: 'completed',
    transactionCharges: transactionFee,
    description: 'Loan Payment',
    transactionType: req.body.transactionType,
    cartType: req.body.type,
    accountNumber: req.body.accountNumber,
    reference: req.body.reference,
    userId: req.user.userId,
  });
  await loan.save();

  res.status(StatusCodes.CREATED).json({
    transaction,
  });
};

const getAllLoan = async (req, res) => {
  const loans = await Loan.find({ userId: req.user.userId });
  res.status(StatusCodes.CREATED).json({ loans, length: loans.length });
};

module.exports = {
  // user
  applyForLoan,
  retrieveLoanDetails,
  loanPayment,
  getAllLoan,
  // admin || member
  getLoanApplications,
  approveLoanApplication,
  rejectLoanApplication,
  getSingleLoanApplications,
};
