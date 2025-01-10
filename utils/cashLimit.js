const { StatusCodes } = require('http-status-codes');
const CustomError = require('../errors');
const Transaction = require('../models/TransactionModel');

async function rateLimit(amount, limit, req, res) {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentTransactions = await Transaction.find({
    createdAt: { $gte: oneWeekAgo },
  });

  const totalWithdrawnThisWeek = recentTransactions.reduce(
    (total, transaction) => total + transaction.amount,
    0
  );

  if (totalWithdrawnThisWeek + amount > limit) {
    const failedTransaction = await Transaction.create({
      ...req.body,
      accountId: req.params.id,
      description: `You have exceeded your limit. You can only withdraw $${limit} per week.`,
      type: 'debit',
      amount,
      status: 'failed',
    });
    return res.status(StatusCodes.CREATED).json({ failedTransaction });
  }
  return;
}

module.exports = rateLimit;
