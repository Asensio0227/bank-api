const sendEmail = require('./sendEmail');

const sendVerificationEmail = async ({ name, email, verificationToken }) => {
  const verifyEmail = verificationToken;
  const message = `<p>Your verification code: 
  <a href="">${verifyEmail}</a>
  </p>`;

  return sendEmail({
    to: email,
    subject: 'Email confirmation',
    html: `<h4>Hello, ${name}</h4>
   ${message}
   `,
  });
};

module.exports = sendVerificationEmail;
