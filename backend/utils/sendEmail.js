const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Create a transporter using standard SMTP (Gmail for praneshgara@gmail.com)
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_EMAIL || 'praneshgara@gmail.com',
      pass: process.env.SMTP_PASSWORD || 'your_app_password'
    }
  });

  const message = {
    from: `${process.env.FROM_NAME || 'Gidy App'} <${process.env.SMTP_EMAIL || 'praneshgara@gmail.com'}>`,
    to: options.email,
    subject: options.subject,
    text: options.message
  };

  const info = await transporter.sendMail(message);
  console.log('Message sent: %s', info.messageId);
};

module.exports = sendEmail;
