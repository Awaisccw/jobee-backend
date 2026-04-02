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
  // CLEAN AND TRIM THE KEYS
  const userEmail = process.env.GOOGLE_USER_EMAIL?.trim();
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN?.trim();

  if (!clientId || !clientSecret || !refreshToken || !userEmail) {
    console.error("CRITICAL ERROR: Environment variables missing!");
    throw new Error("Missing Google API credentials");
  }

  try {
    // 1. Get Access Token
    const { token: accessToken } = await oauth2Client.getAccessToken();

    // 2. Setup the Gmail API
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // 3. Create the Raw Message (Required for the REST API)
    const subject = options.subject;
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const messageParts = [
      `From: Jobee Platform <${userEmail}>`,
      `To: ${options.email}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${utf8Subject}`,
      '',
      options.html || options.message,
    ];
    const message = messageParts.join('\n');

    // 4. Encode message for API
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // 5. SEND! (This is the Web/HTTP Door!)
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    console.log(`Email successfully sent to ${options.email} via GMAIL REST API!`);
    
  } catch (error) {
    console.error("Direct Gmail API failure:", error);
    throw error;
  }
};




module.exports = sendEmail;


