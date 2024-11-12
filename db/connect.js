const mongoose = require('mongoose');

const mongoDb = (url) => {
  return mongoose.connect(url);
};

module.exports = mongoDb;
