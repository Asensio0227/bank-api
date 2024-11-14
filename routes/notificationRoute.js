const express = require('express');
const router = express.Router();

const {
  authenticateUser,
  authorizedPermissions,
} = require('../middleware/authentication');

const {
  sendNotification,
  retrieveNotificationHistory,
} = require('../controllers/notificationController');

router.route('/send').post(authenticateUser, sendNotification);
router.route('/history').post(authenticateUser, retrieveNotificationHistory);

module.exports = router;
