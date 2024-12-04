const Report = require('../models/ReportModel');
const Transaction = require('../models/TransactionModel');
// errors
const CustomError = require('../errors');
const { StatusCodes } = require('http-status-codes');
const auditTransactions = require('../utils/audit');
const createQueryFilters = require('../utils/queryFilters');

const reportsOnTransactions = async (req, res) => {
  const { reportStatus, search, sort } = req.query;
  const queryObject = { userId: req.params.userId };

  if (reportStatus && reportStatus !== 'all') {
    queryObject.status = reportStatus;
  }

  if (search) {
    queryObject.$or = [
      { accountNumber: new RegExp(search, 'i') },
      { accountHolderName: new RegExp(search, 'i') },
      { IdeaNumber: new RegExp(search, 'i') },
    ];
  }

  const { sortKey, skip, limit } = createQueryFilters(req, sort);
  const report = await Report.find(queryObject)
    .populate([
      {
        path: 'accountId',
        select: 'accountNumber branchCode accountHolderName',
      },
      {
        path: 'userId',
        select: 'firstName lastName IdeaNumber email phoneNumber',
      },
      {
        path: 'generatedByUserId',
        select: 'firstName lastName IdeaNumber email phoneNumber',
      },
      {
        path: 'transactionId',
        select: 'firstName lastName IdeaNumber email phoneNumber',
      },
    ])
    .sort(sortKey)
    .skip(skip)
    .limit(limit);
  const totalReport = await Report.countDocuments(queryObject);
  const numOfPages = Math.ceil(totalReport / limit);

  res.status(StatusCodes.OK).json({
    totalReport,
    numOfPages,
    report,
  });
};

const auditLogs = async (req, res) => {
  const { reportStatus, search, sort } = req.query;
  req.body.generatedByUserId = req.user.userId;
  const queryObject = {};

  if (reportStatus && reportStatus !== 'all') {
    queryObject.status = reportStatus;
  }

  if (search) {
    queryObject.$or = [
      { accountNumber: new RegExp(search, 'i') },
      { accountHolderName: { $regex: search, $options: 'i' } },
      { IdeaNumber: { $regex: search, $options: 'i' } },
    ];
  }

  const { sortKey, skip, limit } = createQueryFilters(req, sort);
  const report = await Report.find(queryObject)
    .populate([
      {
        path: 'accountId',
        select: 'accountNumber branchCode accountHolderName',
      },
      {
        path: 'userId',
        select: 'firstName lastName IdeaNumber email phoneNumber avatar',
      },
      {
        path: 'generatedByUserId',
        select: 'firstName lastName IdeaNumber email phoneNumber',
      },
      {
        path: 'transactionId',
        select: 'firstName lastName IdeaNumber email phoneNumber',
      },
    ])
    .sort(sortKey)
    .skip(skip)
    .limit(limit);
  const totalReport = await Report.countDocuments(queryObject);
  const numOfPages = Math.ceil(totalReport / limit);
  res.status(StatusCodes.OK).json({ report, totalReport, numOfPages });
};

const getSingleReport = async (req, res) => {
  const report = await Report.findOne({ _id: req.params.id });
  res.status(StatusCodes.OK).json({ report });
};

const reportUpdate = async (req, res) => {
  const report = await Report.findOne({ _id: req.params.id });

  if (!report) {
    throw new CustomError.BadRequestError(
      `No report with id : ${req.params.id}`
    );
  }

  const updatedReport = await Report.findOneAndUpdate(
    { _id: req.params.id },
    req.body,
    { new: true, runValidators: true }
  );

  res.status(StatusCodes.OK).json({ updatedReport });
};

const createReport = async (req, res) => {
  const { userId, accountId, startDate, endDate } = req.body;

  if (!accountId || !startDate || !endDate) {
    throw new CustomError.BadRequestError('Please provide all values');
  }

  const transactions = await Transaction.find({
    accountId,
    createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
  });

  const totalCredits = transactions
    .filter((t) => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDebits = transactions
    .filter((t) => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalCredits - totalDebits;

  const report = await Report.create({
    accountId,
    totalCredits,
    totalDebits,
    totalTransactions: transactions.length,
    userId,
    netBalance,
    startDate,
    reportStatus: 'finalized',
    endDate,
    generatedByUserId: req.body.userId,
  });

  res
    .status(StatusCodes.CREATED)
    .json({ msg: 'Report created successfully', report });
};

const createAuditReport = async (req, res) => {
  const { userId, startDate, endDate, auditComments } = req.body;
  const id = req.params.id;
  const auditResults = await auditTransactions(
    id,
    new Date(startDate),
    new Date(endDate)
  );
  const netBalance = auditResults.netBalance;

  const reportData = new Report({
    userId,
    startDate,
    endDate,
    totalTransactions: auditResults.totalTransactions,
    netBalance,
    isAudited: true,
    auditComments,
    reportStatus: 'finalized',
    generatedByUserId: req.user.userId,
  });

  await reportData.save();

  res
    .status(StatusCodes.CREATED)
    .json({ message: 'Audit report generated successfully', reportData });
};

module.exports = {
  reportsOnTransactions,
  auditLogs,
  reportUpdate,
  createReport,
  createAuditReport,
  getSingleReport,
};
