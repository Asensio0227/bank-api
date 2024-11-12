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

const authRoute = require('./routes/authRoutes');

app.set('trust-proxy', 1);
app.use(
  rateLimiter({
    window: 15 * 60 * 1000,
    max: 60,
  })
);
app.use(helmet());
app.use(cors());
app.use(xss());
app.use(mongoSanitize());
app.use(morgan('tiny'));
app.use(cookieParser(process.env.JWT_SECRET));
app.use(express.json());

app.get('/', function (req, res) {
  res.send('Bank App');
});

app.get('/api/v1', (req, res) => {
  console.log(req.cookies);
  res.send('Bank App Api');
});

// routes
app.use('/api/v1/auth', authRoute);
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
