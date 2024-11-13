const sendEmail = require('./sendEmail');

const sendResetPasswordEmail = async ({ name, email, token, origin }) => {
  const resetUrl = `${origin}/user/reset-password?token=${token}&email=${email}`;
  const message = `<p>Please reset password by clicking on the following link : 
 <a href="${resetUrl}" target="_blank">Reset password</a>
 </p>`;

  return sendEmail({
    to: email,
    subject: 'Reset password',
    html: `<h4>hello, ${name}!</h4>
  ${message}`,
  });
};

module.exports = sendResetPasswordEmail;
