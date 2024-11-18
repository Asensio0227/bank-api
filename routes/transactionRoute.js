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

router
  .route('/admin')
  .get(
    authorizedPermissions('admin', 'member', 'assistant'),
    getAllTransactions
  );
router.route('/deposit').post(depositTransactions);
router.route('/withdraw').post(withdrawalTransactions);
router.route('/transfer').post(transferTransactions);
router.route('/statement').post(retrieveBankStatement);
router.route('/').get(retrieveTransactions);
router.route('/:id').get(retrieveSingleTransactions);

module.exports = router;
