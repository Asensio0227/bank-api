const express = require('express');
const router = express.Router();

const retrieveNotificationHistory = require('../controllers/notificationController');

router.route('/history').post(retrieveNotificationHistory);

module.exports = router;
