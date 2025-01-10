const AccountModel = require('../models/AccountModel');
const Transaction = require('../models/TransactionModel');

function incrementTransaction(transactions, acc) {
  const totalCredits = transactions
    .filter((t) => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalDebits = transactions
    .filter((t) => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalCharges = transactions.reduce(
    (sum, t) => sum + t.transactionCharges,
    0
  );
  const bal = acc[0].balance;
  let netBalance = bal + totalCredits - (totalDebits + totalCharges) || 0;

  return netBalance;
}

async function auditTransactions(accountId, startDate, endDate, req) {
  const transactions = await Transaction.find({
    accountId,
    createdAt: { $gte: startDate, $lte: endDate },
  });
  const acc = await AccountModel.find({ userId: req.user.userId });

  const totalTransactions = transactions.length;
  const netBalance = incrementTransaction(transactions, acc);

  return {
    totalTransactions,
    netBalance,
    transactions,
  };
}

module.exports = { auditTransactions, incrementTransaction };
