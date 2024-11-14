const CustomError = require('../errors');
const Transaction = require('../models/TransactionModel');

async function rateLimit(amount, limit) {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentTransactions = await Transaction.find({
    createdAt: { $gte: oneWeekAgo },
  });

  const totalWithdrawnThisWeek = recentTransactions.reduce(
    (total, transaction) => total + transaction.amount,
    0
  );

  if (totalWithdrawnThisWeek + amount > limit) {
    throw new CustomError.BadRequestError(
      `You have exceeded your limit. You can only withdraw $${limit} per week.`
    );
  }
  return;
}

module.exports = rateLimit;
