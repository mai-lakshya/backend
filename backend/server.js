const express = require('express');
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');

const app = express();
const port = process.env.PORT || 3000;

// ==========================================
// IMPORTANT: CONFIGURATION
// Replace these with your actual credentials
// ==========================================
// You need to get your Google Client ID from Google Cloud Console.
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

// Update EMAIL_USER and EMAIL_PASS if using Gmail SMTP
const EMAIL_USER = 'YOUR_EMAIL@gmail.com';
// Note: If using Gmail, this MUST be an "App Password", NOT your regular email password.
const EMAIL_PASS = 'YOUR_EMAIL_APP_PASSWORD';
const TARGET_EMAIL = 'lakshyavalecha29@gmail.com';

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Middleware
app.use(cors()); // Configure for frontend domain in production
app.use(express.json());

// Helper function to extract IP
const getIPAddress = (req) => {
    return req.headers['x-forwarded-for'] || req.socket.remoteAddress;
};

app.post('/api/auth/google', async (req, res) => {
    const { credential } = req.body;

    if (!credential) {
        return res.status(400).json({ success: false, message: 'Google Credential Missing' });
    }

    try {
        // Securely verify token signature & expiration against Google Servers
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID,
        });

        // Ensure no fake credentials allowed
        const payload = ticket.getPayload();

        // Extract data
        const { name, email } = payload;
        const ipAddress = getIPAddress(req);
        const loginDate = new Date().toLocaleString();

        console.log(`[AUTH SUCCESS] User Verified: ${name} (${email})`);

        // Create Secure SMTP Transport for Notifications
        const transporter = nodemailer.createTransport({
            service: 'gmail', // Change if using SendGrid, Mailgun, etc.
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: `"Portfolio Alerts" <${EMAIL_USER}>`,
            to: TARGET_EMAIL,
            subject: 'New Website Login',
            text: `A new user logged in via Google Sign In!\n\nName: ${name}\nEmail: ${email}\nLogin date and time: ${loginDate}\nIP address: ${ipAddress}`
        };

        // Attempt Email Delivery securely from backend
        await transporter.sendMail(mailOptions);
        console.log(`[MAIL SUCCESS] Notified: ${TARGET_EMAIL}`);

        res.status(200).json({
            success: true,
            message: 'Authentication secured & logged',
            user: { name, email } // Optional: Send non-sensitive confirmation
        });

    } catch (error) {
        console.error('[AUTH/MAIL ERROR] Action Failed:', error.message);
        res.status(401).json({ success: false, message: 'Invalid credentials or failed backend execution.' });
    }
});

app.listen(port, () => {
    console.log(`=========================================`);
    console.log(`Backend Server Securely Running on Port ${port}`);
    console.log(`Please ensure GOOGLE_CLIENT_ID, EMAIL_USER & EMAIL_PASS are configured.`);
    console.log(`=========================================`);
});
