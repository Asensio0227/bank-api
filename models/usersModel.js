const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const usersModel = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'Please provide your name'],
      minlenght: 5,
      maxlength: 20,
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Please provide your surname'],
      minlenght: 2,
      maxlength: 50,
      trim: true,
    },
    ideaNumber: {
      type: String,
      required: [true, 'Please provide your Idea Number'],
      minlenght: 5,
      maxlength: 20,
      trim: true,
    },
    avatar: {
      type: String,
      validate: {
        validator: validator.isURL,
        message: 'Please provide a valid URL',
      },
    },
    thumbnailUrl: {
      type: String,
      validate: {
        validator: validator.isURL,
        message: 'Please provide a valid URL',
      },
    },
    avatarPublicId: {
      type: String,
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
    expoToken: {
      type: String,
    },
    physicalAddress: {
      type: String,
      required: [true, 'Please provide your physical address'],
    },
    phoneNumber: {
      type: String,
      required: [true, 'Please provide your phone number'],
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
      enum: ['admin', 'user', 'member'],
      default: 'user',
    },
    dob: {
      type: String,
      required: [true, 'Please provide your date of birth'],
    },
    verified: {
      type: Date,
    },
    passwordTokenExpirationDate: {
      type: Date,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    passwordToken: {
      type: String,
    },
    verificationToken: {
      type: Number,
    },
  },
  { timestamps: true }
);

usersModel.pre('save', async function () {
  if (!this.isModified('password')) return;
  const genSalt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, genSalt);
});

usersModel.methods.ComparePassword = async function (candidatePassword) {
  const isMatch = await bcrypt.compare(candidatePassword, this.password);
  return isMatch;
};

module.exports = mongoose.model('User', usersModel);
