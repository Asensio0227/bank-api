const express = require('express');
const router = express.Router();

const {
  authenticateUser,
  authorizedPermissions,
} = require('../middleware/authentication');

const {
  // user
  applyForLoan,
  retrieveLoanDetails,
  loanPayment,
  getAllLoan,
  // admin || member
  getLoanApplications,
  approveLoanApplication,
  rejectLoanApplication,
  getSingleLoanApplications,
} = require('../controllers/loanController');

// admin
router
  .route('/approve/:id')
  .post(
    authenticateUser,
    authorizedPermissions('admin', 'member'),
    approveLoanApplication
  );
router
  .route('/reject/:id')
  .patch(
    authenticateUser,
    authorizedPermissions('admin', 'member'),
    rejectLoanApplication
  );
router
  .route('/admin')
  .get(
    authenticateUser,
    authorizedPermissions('admin', 'member'),
    getLoanApplications
  );
router
  .route('/admin/:id')
  .get(
    authenticateUser,
    authorizedPermissions('admin', 'member'),
    getSingleLoanApplications
  );

// user
router.route('/apply').post(authenticateUser, applyForLoan);
router.route('/').get(authenticateUser, getAllLoan);
router.route('/:id').get(authenticateUser, retrieveLoanDetails);
router.route('/:id/repay').put(authenticateUser, loanPayment);

module.exports = router;
