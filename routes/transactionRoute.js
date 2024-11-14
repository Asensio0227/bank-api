const express = require('express');
const router = express.Router();

const {
  authenticateUser,
  authorizedPermissions,
} = require('../middleware/authentication');

const {
  depositTransactions,
  withdrawalTransactions,
  transferTransactions,
  retrieveTransactions,
  retrieveSingleTransactions,
} = require('../controllers/transactionController');

router.route('/deposit').post(authenticateUser, depositTransactions);
router.route('/withdraw').post(authenticateUser, withdrawalTransactions);
router.route('/transfer').post(authenticateUser, transferTransactions);
router.route('/').get(authenticateUser, retrieveTransactions);
router.route('/:id').get(authenticateUser, retrieveSingleTransactions);

module.exports = router;
