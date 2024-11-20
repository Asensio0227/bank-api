const sendEmail = require('./sendEmail');

const sendResetPasswordEmail = async ({ name, email, token }) => {
  const message = `<p>Your reset code : 
 <a href="" target="_blank">${token}</a>
 </p>`;

  return sendEmail({
    to: email,
    subject: 'Reset password',
    html: `<h4>hello, ${name}!</h4>
  ${message}`,
  });
};

module.exports = sendResetPasswordEmail;
