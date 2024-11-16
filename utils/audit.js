const Transaction = require('../models/TransactionModel');

async function auditTransactions(accountId, startDate, endDate) {
  const transactions = await Transaction.find({
    accountId,
    createdAt: { $gte: startDate, $lte: endDate },
  });

  const totalTransactions = transactions.length;
  const totalCredits = transactions
    .filter((t) => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);

  const deposit = transactions
    .filter((t) => t.transactionType === 'deposit')
    .reduce((sum, t) => sum + t.amount, 0);

  const withDrawalAmount = transactions
    .filter((t) => t.transactionType === 'withdrawal')
    .reduce((sum, t) => sum + t.amount, 0);

  const transfer = transactions
    .filter((t) => t.transactionType === 'transfer')
    .reduce((sum, t) => sum + t.amount, 0);
  let netBalance = deposit - (withDrawalAmount + transfer);

  return {
    totalTransactions,
    netBalance,
    transactions,
  };
}

module.exports = auditTransactions;
