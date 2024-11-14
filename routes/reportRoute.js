const express = require('express');
const router = express.Router();

const {
  authenticateUser,
  authorizedPermissions,
} = require('../middleware/authentication');

const {
  reportsOnTransactions,
  auditLogs,
} = require('../controllers/reportController');

router
  .route('/transactions')
  .get(
    authenticateUser,
    authorizedPermissions('admin', 'member'),
    reportsOnTransactions
  );
router
  .route('/transactions/audit-logs')
  .get(authenticateUser, authorizedPermissions('admin', 'member'), auditLogs);

module.exports = router;
