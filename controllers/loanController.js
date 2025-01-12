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
const createQueryFilters = require('../utils/queryFilters');

// admin
const approveLoanApplication = async (req, res) => {
  const { monthlyPayment, startDate, endDate } = req.body;
  const loan = await Loan.findById(req.params.id);

  if (!loan) {
    throw new CustomError.NotFoundError(`No loan found for ${req.params.id}`);
  }
  checkPermissions(req.user, loan.userId);
  loan.status = 'active';
  loan.applicationStatus = 'accepted';
  loan.totalAmount = loan.loanAmount;
  loan.remainingBalance = loan.loanAmount;
  loan.monthlyPayment = Number(Math.round(monthlyPayment * 100));
  loan.startDate = startDate;
  loan.endDate = endDate;

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
  const {
    applicationStatus,
    status,
    loanType,
    loanAmount,
    search,
    sort,
    employmentStatus,
    minLoanAmount,
    maxLoanAmount,
  } = req.query;
  let queryObject = {};
  if (applicationStatus && applicationStatus.trim() !== 'all')
    queryObject.applicationStatus = applicationStatus;
  if (employmentStatus && employmentStatus.trim() !== 'all')
    queryObject.employmentStatus = employmentStatus;
  if (search) {
    queryObject.email = { $regex: search, $options: 'i' };
  }

  if (loanAmount) {
    const numericLoanAmount = Number(loanAmount);
    if (!isNaN(numericLoanAmount)) {
      queryObject.loanAmount = numericLoanAmount;
    }
  }
  if (minLoanAmount) {
    const numericMinLoanAmount = Number(minLoanAmount);
    if (!isNaN(numericMinLoanAmount)) {
      queryObject.loanAmount = {
        ...queryObject.loanAmount,
        $gte: numericMinLoanAmount,
      }; // Greater than or equal to
    }
  }

  if (maxLoanAmount) {
    const numericMaxLoanAmount = Number(maxLoanAmount);
    if (!isNaN(numericMaxLoanAmount)) {
      queryObject.loanAmount = {
        ...queryObject.loanAmount,
        $lte: numericMaxLoanAmount,
      }; // Less than or equal to
    }
  }
  if (status && status.trim() !== 'all') {
    queryObject.status = status;
  }

  if (loanType && loanType.trim() !== 'all') {
    queryObject.loanType = loanType;
  }

  const sortOptions = {
    newest: '-createdAt',
    oldest: 'createdAt',
    'a-z': `name`,
    'z-a': `-name`,
  };
  const selectedSortOption = sortOptions.newest;
  let sortQuery = {};
  if (selectedSortOption.startsWith('-')) {
    sortQuery[`${selectedSortOption.slice(1)}`] = -1;
  } else {
    sortQuery[selectedSortOption] = 1;
  }
  const { skip, limit, page } = createQueryFilters(req, sort);
  const result = await Loan.aggregate([
    {
      $match: queryObject, // Match any filters applied from queryObject
    },
    {
      $group: {
        _id: '$userId',
        loans: { $push: '$$ROOT' },
        count: { $sum: 1 },
      },
    },
    {
      $facet: {
        metadata: [
          { $count: 'total' }, // Count total number of grouped documents
          { $addFields: { page, limit } }, // Add pagination info
        ],
        data: [
          { $sort: sortQuery }, // Sort based on provided sortKey
          { $skip: skip }, // Skip documents for pagination
          { $limit: limit }, // Limit number of documents returned
        ],
      },
    },
  ]);

  const populatedResults = await Promise.all(
    result[0].data.map(async (group) => {
      const populatedGroup = await Loan.populate(group.loans, [
        {
          path: 'userId',
          select: 'firstName lastName ideaNumber email phoneNumber avatar',
        },
      ]);

      return { ...group, loans: populatedGroup }; // Return group with populated reports
    })
  );

  // Final result with metadata and populated data
  const finalResult = {
    metadata: result[0]?.metadata,
    data: populatedResults,
  };
  const loans = finalResult.data.map((item) => item.loans);
  const resp = loans.flatMap((item) => item);
  const groupLoans = resp.reduce((acc, loan) => {
    const userId = loan.userId._id.toString() || loan.userId.toString();
    checkPermissions(req.user, userId);
    if (!acc[userId]) {
      acc[userId] = { userId: loan.userId, loans: [] };
    }
    acc[userId].loans.push(loan);
    return acc;
  }, {});

  const resultArray = Object.values(groupLoans);
  const { total: totalLoans = 0, page: numOfPages = 1 } =
    finalResult?.metadata[0] || {};
  res.status(StatusCodes.OK).json({
    loans: resultArray,
    totalLoans: totalLoans,
    numOfPages: numOfPages,
  });
};

const getSingleLoanApplications = async (req, res) => {
  const loans = await Loan.findOne({ _id: req.params.id });
  checkPermissions(req.user, loans.userId);
  res.status(StatusCodes.CREATED).json({ loans });
};

const calculateTotalPayableLoanPerMonth = async (req, res) => {
  const { loanAmount, interestRate, loanTerm } = req.body;
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
  let fName = `${user.firstName} ${user.lastName}`;

  req.body.email = user.email;
  req.body.phoneNumber = user.phoneNumber;
  req.body.physicalAddress = user.physicalAddress;
  req.body.dob = user.dob;
  req.body.name = fName;
  req.body.userId = req.user.userId;
  const loanAmount = Number(Math.round(req.body.loanAmount * 100));
  checkPermissions(req.user, req.body.userId);
  const income = Number(Math.round(req.body.income * 100));
  const monthlyPayment = Number(Math.round(req.body.monthlyPayment * 100));
  const collateralValue = Number(Math.round(req.body.collateralValue * 100));
  await Loan.create({
    ...req.body,
    loanAmount,
    income,
    monthlyPayment,
    collateralValue,
  });

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
  const loanAmount = Number(Math.round(loan.loanAmount / 100));
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
    monthlyPayment: monthlyInterestRate * 100,
    balance: loan.remainingBalance,
    totalOfPayments: paymentCount,
  });
};

const loanPayment = async (req, res) => {
  const { amount } = req.body;
  let monthlyPayment = Number(Math.round(amount * 100));
  const acc = await Account.findOne({ accountNumber: req.body.accountNumber });

  if (!acc) {
    throw new CustomError.NotFoundError('No not found!');
  }
  if (acc.balance < monthlyPayment) {
    await Transaction.create({
      ...req.body,
      type: 'debit',
      amount: monthlyPayment,
      status: 'failed',
      accountId: acc._id,
      accountType: acc.accountType,
      description: 'Insufficient funds!',
    });
    res.status(StatusCodes.CREATED).json({ msg: 'Insufficient funds!' });
    return;
  }

  acc.balance -= monthlyPayment;
  req.body.userId = req.user.userId;
  const transaction = processTransactionPayment(req, acc._id);
  const loan = processLoanPayment(req, acc);
  const account = acc.save();
  const data = await Promise.all([account, transaction, loan]);
  res.status(StatusCodes.CREATED).json({
    data,
  });
};

const getAllLoan = async (req, res) => {
  const {
    applicationStatus,
    status,
    loanType,
    loanAmount,
    search,
    sort,
    employmentStatus,
  } = req.query;

  let queryObJect = { userId: req.user.userId };

  if (applicationStatus && applicationStatus.trim() !== 'all')
    queryObJect.applicationStatus = applicationStatus;
  if (employmentStatus && employmentStatus.trim() !== 'all')
    queryObJect.employmentStatus = employmentStatus;

  if (search) {
    queryObJect.email = { $regex: search, $options: 'i' };
  }
  let result = Loan.find(queryObJect).populate([
    {
      path: 'userId',
      select: 'firstName lastName ideaNumber email phoneNumber avatar',
    },
  ]);
  if (loanAmount) {
    const loanAmountNumber = Number(loanAmount);
    result = result.where('loanAmount').gte(loanAmountNumber);
  }

  if (status && status.trim() !== 'all') {
    result = result.where('status').equals(status);
  }

  if (loanType && loanType.trim() !== 'all') {
    result = result.where('loanType').equals(loanType);
  }
  if (sort === 'newest') {
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
  const loans = await result;
  loans.length > 0 &&
    loans.map((loan) => {
      return checkPermissions(req.user, loan.userId._id);
    });
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
