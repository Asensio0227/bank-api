const Report = require('../models/ReportModel');
const Transaction = require('../models/TransactionModel');
// errors
const CustomError = require('../errors');
const { StatusCodes } = require('http-status-codes');
const { auditTransactions } = require('../utils/audit');
const createQueryFilters = require('../utils/queryFilters');
const { checkPermissions } = require('../utils');

const reportsOnTransactions = async (req, res) => {
  const { reportStatus, search, sort } = req.query;
  const queryObject = { userId: req.params.userId };

  if (reportStatus && reportStatus.trim() !== 'all') {
    queryObject.status = reportStatus;
  }

  if (search) {
    queryObject.$or = [
      { accountNumber: new RegExp(search, 'i') },
      { accountHolderName: new RegExp(search, 'i') },
      { ideaNumber: new RegExp(search, 'i') },
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
        select: 'firstName lastName ideaNumber email phoneNumber avatar',
      },
      {
        path: 'generatedByUserId',
        select: 'firstName lastName ideaNumber email phoneNumber avatar',
      },
      {
        path: 'transactionId',
        select: 'amount type accountNumber accountType',
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
  let queryObject = {};

  if (reportStatus && reportStatus.trim() !== 'all') {
    queryObject.reportStatus = reportStatus.trim();
  }

  if (search) {
    const accountNumberSearch = Number(search);
    if (!isNaN(accountNumberSearch)) {
      queryObject.accountNumber = accountNumberSearch;
    }
  }

  const sortOptions = {
    newest: '-createdAt',
    oldest: 'createdAt',
    'a-z': `firstName`,
    'z-a': `-firstName`,
  };
  const selectedSortOption = sortOptions.newest;
  let sortQuery = {};
  if (selectedSortOption.startsWith('-')) {
    sortQuery[`${selectedSortOption.slice(1)}`] = -1;
  } else {
    sortQuery[selectedSortOption] = 1;
  }
  const { skip, limit, page } = createQueryFilters(req, sort);
  const result = await Report.aggregate([
    {
      $match: queryObject, // Match any filters applied from queryObject
    },
    {
      $group: {
        _id: '$userId',
        reports: { $push: '$$ROOT' },
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
      const populatedGroup = await Report.populate(group.reports, [
        {
          path: 'accountId',
          select: 'accountNumber branchCode accountHolderName',
        },
        {
          path: 'userId',
          select: 'firstName lastName ideaNumber email phoneNumber avatar',
        },
        {
          path: 'generatedByUserId',
          select: 'firstName lastName ideaNumber email phoneNumber avatar',
        },
        {
          path: 'transactionId',
          select: 'amount type accountNumber accountType',
        },
      ]);

      return { ...group, reports: populatedGroup }; // Return group with populated reports
    })
  );

  // Final result with metadata and populated data
  const finalResult = {
    metadata: result[0].metadata,
    data: populatedResults,
  };
  const reports = finalResult.data.map((report) => report.reports);
  const resp = reports.flatMap((item) => item);
  const groupReports = resp.reduce((acc, report) => {
    const userId = report.userId._id.toString() || report.userId.toString();
    // const id = report._id.toString();
    checkPermissions(req.user, userId);
    if (!acc[userId]) {
      acc[userId] = { userId: report.userId, reports: [] };
    }
    acc[userId].reports.push(report);
    return acc;
  }, {});

  const resultArray = Object.values(groupReports);
  const { total: totalReport, page: numOfPages } = finalResult.metadata[0];
  res.status(StatusCodes.OK).json({ numOfPages, totalReport, resultArray });
};

const getSingleReport = async (req, res) => {
  const report = await Report.findOne({ _id: req.params.id }).populate([
    {
      path: 'accountId',
      select: 'accountNumber branchCode accountHolderName',
    },
    {
      path: 'userId',
      select: 'firstName lastName ideaNumber email phoneNumber avatar',
    },
    {
      path: 'generatedByUserId',
      select: 'firstName lastName ideaNumber email phoneNumber avatar',
    },
    {
      path: 'transactionId',
      select: 'amount type  accountNumber accountType',
    },
  ]);
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
  const { userId, accountId, startDate, endDate, accountNumber, desc } =
    req.body;

  if (!accountId || !startDate || !endDate || !desc) {
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

  const netBalance = totalDebits - totalCredits;
  const report = await Report.create({
    accountId,
    accountNumber,
    desc,
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
    new Date(endDate),
    req
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
