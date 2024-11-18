const express = require('express');
const router = express.Router();

const {
  authorizedPermissions,
  checkForTestUser,
} = require('../middleware/authentication');
const {
  getAllUsers,
  showCurrentUser,
  getSingleUser,
  updateUser,
  updateUserPassword,
  updateUserStatus,
  deleteUser,
} = require('../controllers/userController');
const { upload } = require('../middleware/multerMiddleware');
const { createPushToken } = require('../controllers/expoController');

router
  .route('/')
  .get(authorizedPermissions('admin', 'member', 'assistant'), getAllUsers);
router.route('/showMe').get(showCurrentUser);
router
  .route('/updateUser')
  .patch(checkForTestUser, upload.single('avatar'), updateUser);
router.route('/updateUserPassword').patch(checkForTestUser, updateUserPassword);
router.route('/expo-token').post(createPushToken);
router.route('/').delete(authorizedPermissions('admin'), deleteUser);
router
  .route('/updateUserStatus/:id')
  .patch(authorizedPermissions('admin'), updateUserStatus);
router.route('/:id').get(getSingleUser);
router
  .route('/:id')
  .delete(authorizedPermissions('admin', 'member', 'assistant'), getSingleUser);

module.exports = router;
