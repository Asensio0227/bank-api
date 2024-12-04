const express = require('express');
const router = express.Router();

const { authorizedPermissions } = require('../middleware/authentication');

const {
  // admin || member
  createAccount,
  getAllAccounts,
  deleteAccount,
  updateAccount,
  // user
  getAllUserAccounts,
  getSingleAccount,
  updateUserAccount,
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
router
  .route('/update/:id', authorizedPermissions('admin', 'member'))
  .patch(updateAccount);

// user
router.route('/').get(getAllUserAccounts);
router.route('/link').post(linkExistingAccount);
router.route('/update-user-account/:id').put(updateAccount);
router.route('/:id').get(getSingleAccount);

module.exports = router;
