require('dotenv').config();
require('express-async-errors');

const express = require('express');
const app = express();

const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimiter = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const cors = require('cors');
const mongoDb = require('./db/connect');
const notFoundMiddleware = require('./middleware/not-found');
const errorHandleMiddleware = require('./middleware/error-handle');
const fileUpload = require('express-fileupload');
const cloudinary = require('cloudinary');

const authRoute = require('./routes/authRoutes');
const userRoute = require('./routes/userRoute');
const accountRoute = require('./routes/accountRoute');
const loanRoute = require('./routes/loanRoute');
const reportRoute = require('./routes/reportRoute');
const notificationRoute = require('./routes/notificationRoute');
const transactionRoute = require('./routes/transactionRoute');

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

app.set('trust-proxy', 1);
app.use(
  rateLimiter({
    window: 15 * 60 * 1000,
    max: 60,
  })
);

app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser(process.env.JWT_SECRET));
app.use(helmet());
app.use(cors());
app.use(xss());
app.use(mongoSanitize());
app.use(fileUpload());

app.get('/', function (req, res) {
  res.send('Bank App');
});

app.get('/api/v1', (req, res) => {
  // console.log(req.cookies);
  console.log(req.signedCookies);
  res.send('Bank App Api');
});
// routes
app.use('/api/v1/auth', authRoute);
app.use('/api/v1/user', userRoute);
app.use('/api/v1/account', accountRoute);
app.use('/api/v1/loan', loanRoute);
app.use('/api/v1/report', reportRoute);
app.use('/api/v1/notification', notificationRoute);
app.use('/api/v1/transaction', transactionRoute);
// middleware
app.use(notFoundMiddleware);
app.use(errorHandleMiddleware);

const port = process.env.PORT || 5000;

const start = async () => {
  try {
    await mongoDb(process.env.MONGO_URL);
    app.listen(port, () => {
      console.log(`Server listening on ${port}...`);
    });
  } catch (error) {
    console.log(error);
  }
};

start();
