const express = require('express');
const router = express.Router();

const { authorizedPermissions } = require('../middleware/authentication');

const {
  reportsOnTransactions,
  auditLogs,
  reportUpdate,
  createReport,
  createAuditReport,
  getSingleReport,
} = require('../controllers/reportController');

router
  .route('/transactions/audit-logs')
  .get(authorizedPermissions('admin', 'member'), auditLogs);
router
  .route('/transactions/audit-logs')
  .post(authorizedPermissions('admin', 'member'), createReport);
router
  .route('/transactions/audit-logs/:id')
  .patch(authorizedPermissions('admin'), reportUpdate);
router
  .route('/transactions/:userId')
  .get(authorizedPermissions('admin', 'member'), reportsOnTransactions);
router
  .route('/transaction/:id')
  .get(authorizedPermissions('admin', 'member'), getSingleReport);

router
  .route('/transactions/audit/ai/:id')
  .post(authorizedPermissions('admin'), createAuditReport);

module.exports = router;
