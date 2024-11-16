const Loan = require('../models/LoanModel');
const Transaction = require('../models/TransactionModel');
const CustomError = require('../errors');
async function processLoanPayment(req) {
  const { monthlyPayment } = req.body;
  if (!monthlyPayment || isNaN(monthlyPayment)) {
    throw new CustomError.BadRequestError('Invalid values!');
  }
  const loan = await Loan.findOne({
    status: 'active',
    userId: req.user.userId,
  });

  if (!loan) {
    throw new CustomError.NotFoundError('Loan not found or inactive.');
  }

  if (monthlyPayment > loan.remainingBalance) {
    throw new CustomError.BadRequestError(
      'Payment amount exceeds remaining balance'
    );
  }

  loan.payments.push({
    month: new Date().getMonth() + 1,
    monthlyPayment,
    datePaid: new Date(),
  });

  if (loan.remainingBalance <= 0) {
    loan.status = 'paid';
    loan.remainingBalance = 0;
  } else {
    const amount = loan.remainingBalance - monthlyPayment;
    loan.remainingBalance = amount;
    console.log(amount);
  }
  await loan.save();
  return loan;
}

async function processTransactionPayment(req, id) {
  const charges = 0.0125 * req.body.monthlyPayment;
  const transactionFee = charges;
  const transaction = await Transaction.create({
    amount: req.body.monthlyPayment,
    accountId: id,
    status: 'completed',
    transactionCharges: transactionFee,
    description: 'Loan Payment',
    type: 'debit',
    transactionType: req.body.transactionType,
    cartType: req.body.type,
    accountNumber: req.body.accountNumber,
    reference: req.body.reference,
    userId: req.user.userId,
  });
  return transaction;
}

function calculateMonthlyPayment(loanData) {
  const P = loanData.loanAmount;
  const annualInterestRate = loanData.interestRate / 100;
  const r = annualInterestRate / 12;
  const n = loanData.loanTerm;
  const M = (P * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
  return M;
}

module.exports = {
  calculateMonthlyPayment,
  processLoanPayment,
  processTransactionPayment,
};
