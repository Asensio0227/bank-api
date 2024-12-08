const express = require('express');
const router = express.Router();

const { authorizedPermissions } = require('../middleware/authentication');

const {
  depositTransactions,
  withdrawalTransactions,
  transferTransactions,
  retrieveTransactions,
  retrieveSingleTransactions,
  getAllTransactions,
  retrieveBankStatement,
} = require('../controllers/transactionController');

router.route('/:accountNumber').get(retrieveTransactions);
router
  .route('/admin')
  .get(
    authorizedPermissions('admin', 'member', 'assistant'),
    getAllTransactions
  );
router.route('/deposit').post(depositTransactions);
router.route('/withdraw').post(withdrawalTransactions);
router.route('/transfer').post(transferTransactions);

router.route('/statement/:accountNumber').post(retrieveBankStatement);
router.route('/retrieve/:id').get(retrieveSingleTransactions);

module.exports = router;
