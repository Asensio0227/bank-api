const express = require('express');
const router = express.Router();

const {
  register,
  login,
  logout,
  forgotPassword,
} = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.get('/logout', logout);
router.get('/forgot-password', forgotPassword);

module.exports = router;
