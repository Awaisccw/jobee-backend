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
  // CLEAN AND TRIM THE KEYS (Fixes the common copy-paste space error!)
  const userEmail = process.env.GOOGLE_USER_EMAIL?.trim();
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN?.trim();

  // Debug check for missing variables
  if (!clientId || !clientSecret || !refreshToken || !userEmail) {
    console.error("CRITICAL ERROR: One or more GOOGLE environment variables are missing or empty!");
    throw new Error("Missing Google API credentials");
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      debug: true,
      logger: true, 
      auth: {
        type: 'OAuth2',
        user: userEmail,
        clientId: clientId,
        clientSecret: clientSecret,
        refreshToken: refreshToken,
      },
    });

    const mailOptions = {
      from: `"Jobee Platform" <${userEmail}>`,
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


