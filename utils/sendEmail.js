const nodemailerConfig = require('./nodemailerConfig');
const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, html }) => {
  const transport = nodemailer.createTransport(nodemailerConfig);
  return transport.sendMail({
    from: `CBS <${process.env.NODEMAILER_SENDER}>`,
    to,
    subject,
    html,
  });
};

module.exports = sendEmail;
