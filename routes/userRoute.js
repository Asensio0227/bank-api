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
  deleteUser,
  uploadImageAccount,
} = require('../controllers/userController');

router
  .route('/')
  .get(authenticateUser, authorizedPermissions('admin', 'member'), getAllUsers);
router.route('/showMe').get(authenticateUser, showCurrentUser);
router.route('/updateUser').patch(authenticateUser, updateUser);
router.route('/updateUserPassword').patch(authenticateUser, updateUserPassword);
router
  .route('/admin/upload')
  .post(
    authenticateUser,
    authorizedPermissions('admin', 'member'),
    uploadImageAccount
  );
router
  .route('/')
  .delete(authenticateUser, authorizedPermissions('admin'), deleteUser);
router
  .route('/updateUserStatus/:id')
  .patch(authenticateUser, authorizedPermissions('admin'), updateUserStatus);
router.route('/:id').get(authenticateUser, getSingleUser);
router
  .route('/:id')
  .delete(
    authenticateUser,
    authorizedPermissions('admin', 'member'),
    getSingleUser
  );

module.exports = router;
