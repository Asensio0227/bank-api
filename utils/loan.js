const Loan = require('../models/LoanModel');
const CustomError = require('../errors');
async function calculateTotalPayable(monthlyPayment, req) {
  if (!monthlyPayment || isNaN(monthlyPayment)) {
    throw new CustomError.BadRequestError('Invalid values!');
  }

  const loan = await Loan.findOne({
    status: 'active',
    userId: req.user.userId,
  }); // Find user's active loan

  if (!loan) {
    throw new CustomError.NotFoundError('Loan not found or inactive.');
  }

  if (monthlyPayment > loan.remainingBalance) {
    throw new CustomError.BadRequestError(
      'Payment amount exceeds remaining balance'
    );
  }
  const loanAmount = loan.totalAmount;
  const termMonths = loan.loanTerm;
  const interestRate = loan.interestRate;
  const annualInterestRate = loanAmount * (interestRate / 100);
  const monthlyInterestRate = annualInterestRate / 12;
  // const bankCharges = loanAmount * (bankChargesRate / 100);

  const monthlyInterestRatePayment =
    (loanAmount *
      (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, termMonths))) /
    (Math.pow(1 + monthlyInterestRate, termMonths) - 1);
  const totalPayable = (monthlyPayment + monthlyInterestRatePayment).toFixed(2);

  return { loan, totalPayable, monthlyInterestRatePayment };
}

module.exports = {
  calculateTotalPayable,
};
