const express = require('express');
const router = express.Router();

const {
  authenticateUser,
  authorizedPermissions,
} = require('../middleware/authentication');
const {
  getAllUsers,
  showCurrentUser,
  getSingleUser,
  updateUser,
  updateUserPassword,
  updateUserStatus,
} = require('../controllers/userController');

router
  .route('/')
  .get(authenticateUser, authorizedPermissions('admin'), getAllUsers);
router.route('/showMe').get(authenticateUser, showCurrentUser);
router.route('/updateUser').patch(authenticateUser, updateUser);
router.route('/updateUserPassword').patch(authenticateUser, updateUserPassword);
router
  .route('/updateUserStatus/:id')
  .patch(authenticateUser, authorizedPermissions('admin'), updateUserStatus);
router.route('/:id').get(authenticateUser, getSingleUser);

module.exports = router;
