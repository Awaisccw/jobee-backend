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
  // Debug check for missing variables
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN || !process.env.GOOGLE_USER_EMAIL) {
    console.error("CRITICAL ERROR: One or more GOOGLE environment variables are missing in Render settings!");
    console.log("Status check:", {
      clientId: !!process.env.GOOGLE_CLIENT_ID,
      clientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: !!process.env.GOOGLE_REFRESH_TOKEN,
      userEmail: !!process.env.GOOGLE_USER_EMAIL
    });
    throw new Error("Missing Google API credentials");
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      debug: true, // Enable detailed debug logs
      logger: true, // Log all SMTP activity
      auth: {
        type: 'OAuth2',
        user: process.env.GOOGLE_USER_EMAIL,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
      },
    });

    const mailOptions = {
      from: `"Jobee Platform" <${process.env.GOOGLE_USER_EMAIL}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email successfully sent to ${options.email}`);
    
  } catch (error) {
    console.error("Detailed Gmail API failure:", error);
    throw error;
  }
};


module.exports = sendEmail;


