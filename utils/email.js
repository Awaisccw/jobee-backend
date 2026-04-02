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
    // 2. Get the Access Token for this session
    const accessToken = await oauth2Client.getAccessToken();

    // 3. Create a transporter that uses GMAIL API (Transport Plugin)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.GOOGLE_USER_EMAIL, // E.g., awaisccw111@gmail.com
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
        accessToken: accessToken.token,
      },
    });

    // 4. Define the email options
    const mailOptions = {
      from: `Jobee Platform <${process.env.GOOGLE_USER_EMAIL}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    };

    // 5. Send the email!
    await transporter.sendMail(mailOptions);
    console.log(`Email successfully sent to ${options.email} via Gmail API.`);
    
  } catch (error) {
    console.error("Gmail API Send Failure:", error);
    throw error; // Re-throw to be caught in auth.js
  }
};

module.exports = sendEmail;


