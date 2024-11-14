const express = require('express');
const router = express.Router();

const {
  authenticateUser,
  authorizedPermissions,
} = require('../middleware/authentication');

const {
  // admin || member
  createAccount,
  getAllAccounts,
  deleteAccount,
  // user
  getAllUserAccounts,
  getSingleAccount,
  updateAccount,
  linkExistingAccount,
} = require('../controllers/accountController');

// admin
router
  .route('/admin')
  .get(
    authenticateUser,
    authorizedPermissions('admin', 'member'),
    getAllAccounts
  );
router
  .route('/admin/:id')
  .delete(authenticateUser, authorizedPermissions('admin'), deleteAccount);
router
  .route('/admin')
  .post(
    authenticateUser,
    authorizedPermissions('admin', 'member'),
    createAccount
  );

// user
router.route('/').get(authenticateUser, getAllUserAccounts);
router.route('/link').post(authenticateUser, linkExistingAccount);
router.route('/update/:id').patch(authenticateUser, updateAccount);
router.route('/:id').get(authenticateUser, getSingleAccount);

module.exports = router;
