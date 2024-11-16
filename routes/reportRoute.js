const express = require('express');
const router = express.Router();

const {
  authenticateUser,
  authorizedPermissions,
} = require('../middleware/authentication');

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
  .get(authenticateUser, authorizedPermissions('admin', 'member'), auditLogs);
router
  .route('/transactions/audit-logs')
  .post(
    authenticateUser,
    authorizedPermissions('admin', 'member'),
    createReport
  );
router
  .route('/transactions/audit-logs/:id')
  .patch(authenticateUser, authorizedPermissions('admin'), reportUpdate);
router
  .route('/transactions/:userId')
  .get(
    authenticateUser,
    authorizedPermissions('admin', 'member'),
    reportsOnTransactions
  );
router
  .route('/transaction/:id')
  .get(
    authenticateUser,
    authorizedPermissions('admin', 'member'),
    getSingleReport
  );

router
  .route('/transactions/audit/ai/:id')
  .post(authenticateUser, authorizedPermissions('admin'), createAuditReport);

module.exports = router;
