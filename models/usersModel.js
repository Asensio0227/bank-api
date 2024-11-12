const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const path = require('jsonwebtoken');

const usersModel = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'Please provide your name'],
      unique: true,
      minlength: 5,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: [true, 'Please provide your surname'],
      unique: true,
    },
    email: {
      type: String,
      unique: true,
      required: [true, 'Please provide your email address'],
      validate: {
        validator: validator.isEmail,
        message: 'Please provide your email address',
      },
    },
    banned: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
      required: [true, 'Please provide your password'],
      minlength: 6,
    },
    roles: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user',
    },
    dob: {
      type: String,
      required: [true, 'Please provide your'],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', usersModel);
