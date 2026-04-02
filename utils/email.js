const nodemailer = require('nodemailer');
const dns = require('dns');

const sendEmail = async (options) => {
  // 1) Create a transporter
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // use STARTTLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
    // THE FINAL AGGRESSIVE TRICK: Force DNS to only return IPv4
    lookup: (hostname, options, callback) => {
      dns.lookup(hostname, { family: 4 }, callback);
    },
  });

  // 2) Define the email options
  const mailOptions = {
    from: `Jobee Platform <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  // 3) Actually send the email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;

