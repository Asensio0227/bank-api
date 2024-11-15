const sendEmail = require('./sendEmail');

const sendVerificationEmail = async ({
  name,
  email,
  origin,
  verificationToken,
}) => {
  const verifyEmail = `${origin}/user/verify-email?token=${verificationToken}&email=${email}`;
  const message = `<p>Please confirm your email by clicking the following link : 
  <a href="${verifyEmail}">verify email</a>
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
