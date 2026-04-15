require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.EMAIL_USER,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
  },
});

// Verify the connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Error connecting to email server:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});
// Function to send email
const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"BackendLedger" <${process.env.EMAIL_USER}>`, // sender address
      to, // list of receivers
      subject, // Subject line
      text, // plain text body
      html, // html body
    });

    console.log('Message sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

async function sendregistrationEmail(username, name) {
    const subject = 'Welcome to BackendLedger!';
    const text = `Hello ${name}, \n \n Thank you for registering with BackendLedger. We are excited to have you on board! \n \n If you have any questions or need assistance, feel free to reach out to our support team. \n \n Best regards, \n The BackendLedger Team`;
    const html = `<p>Hello ${name},</p><p>Thank you for registering with BackendLedger. We are excited to have you on board!</p><p>If you have any questions or need assistance, feel free to reach out to our support team.</p><p>Best regards,<br>The BackendLedger Team</p>`;
    await sendEmail(username, subject, text, html);
}

async function sendTransactionEmail(to, name, amount) {
    const subject = 'Transaction Successful!';
    const text = `Hello ${name}, \n \n Your transaction of $${amount} has been successfully processed. \n \n If you have any questions or need assistance, feel free to reach out to our support team. \n \n Best regards, \n The BackendLedger Team`;
    const html = `<p>Hello ${name},</p><p>Your transaction of $${amount} has been successfully processed.</p><p>If you have any questions or need assistance, feel free to reach out to our support team.</p><p>Best regards,<br>The BackendLedger Team</p>`;
    await sendEmail(to, subject, text, html);
}
async function sendTransactionFailureEmail(to, name, amount) {
    const subject = 'Transaction Failed!';
    const text = `Hello ${name}, \n \n Your transaction of $${amount} has failed. \n \n If you have any questions or need assistance, feel free to reach out to our support team. \n \n Best regards, \n The BackendLedger Team`;
    const html = `<p>Hello ${name},</p><p>Your transaction of $${amount} has failed.</p><p>If you have any questions or need assistance, feel free to reach out to our support team.</p><p>Best regards,<br>The BackendLedger Team</p>`;
    await sendEmail(to, subject, text, html);
}
module.exports = {sendEmail, sendregistrationEmail, sendTransactionEmail, sendTransactionFailureEmail};
