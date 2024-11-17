const express = require('express');
const router = express.Router();

const { authenticateUser } = require('../middleware/authentication');

const retrieveNotificationHistory = require('../controllers/notificationController');

router.route('/history').post(authenticateUser, retrieveNotificationHistory);

module.exports = router;
