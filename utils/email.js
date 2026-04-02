const { google } = require('googleapis');
const nodemailer = require('nodemailer');

// 1. Initialize the OAuth2 Client
const OAuth2 = google.auth.OAuth2;
const oauth2Client = new OAuth2(
  process.env.GOOGLE_CLIENT_ID, // YOUR CLIENT ID
  process.env.GOOGLE_CLIENT_SECRET, // YOUR CLIENT SECRET
  "https://developers.google.com/oauthplayground" // REDIRECT URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN, // YOUR REFRESH TOKEN
});

const sendEmail = async (options) => {
  try {
    // 2. Create the transporter using standard OAuth2 type
    // This allows Nodemailer to handle token refreshes automatically
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        type: 'OAuth2',
        user: process.env.GOOGLE_USER_EMAIL,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
      },
    });

    // 3. Define the email options
    const mailOptions = {
      from: `"Jobee Platform" <${process.env.GOOGLE_USER_EMAIL}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    };

    // 4. Send the email!
    await transporter.sendMail(mailOptions);

    console.log(`Email successfully sent to ${options.email} via Gmail API.`);
    
  } catch (error) {
    console.error("Gmail API Send Failure:", error);
    throw error; // Re-throw to be caught in auth.js
  }
};

module.exports = sendEmail;


