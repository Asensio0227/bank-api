const express = require('express');
const router = express.Router();

const { authorizedPermissions } = require('../middleware/authentication');

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
  .get(authorizedPermissions('admin', 'member', 'assistant'), getAllAccounts);
router
  .route('/admin/:id')
  .delete(authorizedPermissions('admin'), deleteAccount);
router
  .route('/admin')
  .post(authorizedPermissions('admin', 'member'), createAccount);

// user
router.route('/').get(getAllUserAccounts);
router.route('/link').post(linkExistingAccount);
router.route('/update/:id').patch(updateAccount);
router.route('/:id').get(getSingleAccount);

module.exports = router;
