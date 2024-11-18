const express = require('express');
const router = express.Router();

const { authorizedPermissions } = require('../middleware/authentication');

const {
  // user
  applyForLoan,
  retrieveLoanDetails,
  loanPayment,
  getAllLoan,
  loanPaymentBalance,
  // admin || member
  getLoanApplications,
  approveLoanApplication,
  rejectLoanApplication,
  getSingleLoanApplications,
  calculateTotalPayableLoanPerMonth,
} = require('../controllers/loanController');

// admin
router
  .route('/approve/:id')
  .post(authorizedPermissions('admin', 'member'), approveLoanApplication);
router
  .route('/calculate/:id')
  .patch(
    authorizedPermissions('admin', 'member'),
    calculateTotalPayableLoanPerMonth
  );
router
  .route('/reject/:id')
  .patch(authorizedPermissions('admin', 'member'), rejectLoanApplication);
router
  .route('/admin')
  .get(authorizedPermissions('admin', 'member'), getLoanApplications);
router
  .route('/admin/:id')
  .get(authorizedPermissions('admin', 'member'), getSingleLoanApplications);

// user
router.route('/apply').post(applyForLoan);
router.route('/').get(getAllLoan);
router.route('/:id').get(retrieveLoanDetails);
router.route('/loan-payment/:id').get(loanPaymentBalance);
router.route('/:id/repay').put(loanPayment);

module.exports = router;
