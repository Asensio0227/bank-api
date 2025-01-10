const Loan = require('../models/LoanModel');
const Transaction = require('../models/TransactionModel');
const CustomError = require('../errors');
async function processLoanPayment(req, acc) {
  const { amount } = req.body;
  const monthlyPayment = Number(Math.round(amount * 100));
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
    await Transaction.create({
      ...req.body,
      type: 'debit',
      amount: monthlyPayment,
      status: 'failed',
      accountId: acc._id,
      accountType: acc.accountType,
      description: 'Payment amount exceeds remaining balance!',
    });
    res
      .status(StatusCodes.CREATED)
      .json({ msg: 'Payment amount exceeds remaining balance!' });
    return;
  }

  let numberOfMonthsPaid = 0;

  for (let i = 0; i < loan.payments.length; i++) {
    numberOfMonthsPaid++;
  }

  loan.payments.push({
    month: numberOfMonthsPaid + 1,
    paymentAmount: monthlyPayment,
    datePaid: new Date(),
  });

  if (loan.remainingBalance <= 0) {
    loan.status = 'paid';
    loan.remainingBalance = 0;
  } else {
    const amount = loan.remainingBalance - monthlyPayment;
    loan.remainingBalance = amount;
  }
  await loan.save();
  return loan;
}

async function processTransactionPayment(req, id) {
  const charges = 0.0125 * req.body.amount;
  const monthlyPayment = Number(Math.round(req.body.amount * 100));
  const transactionFee = Number(Math.round(charges * 100));
  const transaction = await Transaction.create({
    amount: monthlyPayment,
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
    location: req.body.location,
  });
  return transaction;
}

function calculateMonthlyPayment(loanData) {
  const P = loanData.loanAmount;
  const annualInterestRate = loanData.interestRate / 100;
  const r = annualInterestRate / 12;
  const n = loanData.loanTerm;
  const M = (P * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
  return Number(M.toFixed(2));
}

module.exports = {
  calculateMonthlyPayment,
  processLoanPayment,
  processTransactionPayment,
};
