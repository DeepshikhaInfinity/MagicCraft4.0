import express from 'express';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { LogInCollection, LoginHistoryCollection } from './mongo.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Verify required environment variables
const requiredEnvVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'SESSION_SECRET',
    'EMAIL_USER',
    'EMAIL_CLIENT_ID',
    'EMAIL_CLIENT_SECRET',
    'EMAIL_REFRESH_TOKEN'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
    console.error('Please check your .env file');
    process.exit(1);
}

// OAuth2 setup
const oAuth2Client = new google.auth.OAuth2(
    process.env.EMAIL_CLIENT_ID,
    process.env.EMAIL_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
);
oAuth2Client.setCredentials({ refresh_token: process.env.EMAIL_REFRESH_TOKEN });

// Store OTPs in memory
const otpStore = new Map();

// Email transport setup
async function createTransporter() {
    const accessToken = await oAuth2Client.getAccessToken();
    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            type: "OAuth2",
            user: process.env.EMAIL_USER,
            clientId: process.env.EMAIL_CLIENT_ID,
            clientSecret: process.env.EMAIL_CLIENT_SECRET,
            refreshToken: process.env.EMAIL_REFRESH_TOKEN,
            accessToken: accessToken.token
        }
    });
}

// Email sending function
async function sendEmail(to, subject, htmlContent) {
    try {
        const transporter = await createTransporter();
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to,
            subject,
            html: htmlContent
        };
        await transporter.sendMail(mailOptions);
        console.log("✅ Email sent successfully");
    } catch (error) {
        console.error("❌ Email Sending Error:", error);
        throw error;
    }
}

// OTP functions
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function saveOTP(email, otp) {
    otpStore.set(email, {
        code: otp,
        expiry: Date.now() + 5 * 60 * 1000 // 5 minutes
    });
}

function verifyOTP(email, userSubmittedOTP) {
    const otpData = otpStore.get(email);
    if (!otpData) return false;
    if (Date.now() > otpData.expiry) {
        otpStore.delete(email);
        return false;
    }
    if (otpData.code !== userSubmittedOTP) return false;
    otpStore.delete(email);
    return true;
}

// Password validation
function validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
}

// Passport configuration
passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await LogInCollection.findOne({ email: profile.emails[0].value });

        if (!user) {
            user = await LogInCollection.create({
                name: profile.displayName,
                email: profile.emails[0].value,
                googleId: profile.id,
                verified: true
            });
        }
        
        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
}));

// Routes

// Google OAuth routes
router.get("/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get("/google/callback",
    passport.authenticate("google", { failureRedirect: "/" }),
    async (req, res) => {
        if (!req.user) {
            return res.redirect("/");
        }

        try {
            const userEmail = req.user.email;
            const userData = await LogInCollection.findOne({ email: userEmail });

            if (!userData) {
                return res.render("signup", { error: "❌ Email not found. Please sign up first." });
            }

            req.session.user = {
                email: userEmail,
                name: userData.name
            };

            res.redirect("/dashboard");
        } catch (error) {
            console.error("Authentication error:", error);
            res.redirect("/");
        }
    }
);

// Registration
router.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const existingUser = await LogInCollection.findOne({ email });
        if (existingUser) {
            return res.status(400).send("❌ User already exists");
        }

        if (!validatePassword(password)) {
            return res.status(400).send("❌ Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.");
        }

        const otp = generateOTP();
        saveOTP(email, otp);

        req.session.tempUser = {
            name,
            email,
            password: await bcrypt.hash(password, 10)
        };

        await sendEmail(email, "Verify Your Email", 
            `<h1>Email Verification</h1><p>Your verification code is: <strong>${otp}</strong></p><p>This code will expire in 5 minutes.</p>`
        );

        res.render("verifyOTP", { email });
    } catch (error) {
        console.error("❌ Signup error:", error);
        res.status(500).send("❌ Error during signup");
    }
});

// OTP Verification
router.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;

    if (!verifyOTP(email, otp)) {
        return res.status(400).send("❌ Invalid or expired OTP.");
    }

    if (req.session.tempUser && req.session.tempUser.email === email) {
        const { name, password } = req.session.tempUser;
        await LogInCollection.create({ name, email, password, verified: true });
        delete req.session.tempUser;

        return res.send("✅ Signup successful! <a href='/'>Go to Login</a>");
    }

    res.render("resetPassword", { email });
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await LogInCollection.findOne({ email });
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).send("❌ Invalid credentials");
    }
    
    if (!user.verified) {
        return res.status(400).send("❌ Please verify your email before logging in.");
    }
    
    req.session.user = { name: user.name, email: user.email };
    await LoginHistoryCollection.create({ name: user.name, email: user.email });
    res.send(`✅ Welcome ${user.name}, you have successfully logged in! <br><a href='/logout'>Logout</a>`);
});

// Password Reset
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    const user = await LogInCollection.findOne({ email });

    if (!user) {
        return res.status(400).send("❌ Email not found. Please sign up.");
    }

    const otp = generateOTP();
    saveOTP(email, otp);
    await sendEmail(email, "Password Reset OTP", 
        `<p>Your OTP: <strong>${otp}</strong></p><p>Expires in 5 minutes.</p>`
    );

    res.render("verifyOTP", { email });
});

router.post('/reset-password', async (req, res) => {
    const { email, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
        return res.status(400).send("❌ Passwords do not match.");
    }

    if (!validatePassword(newPassword)) {
        return res.status(400).send("❌ Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await LogInCollection.updateOne({ email }, { $set: { password: hashedPassword } });

    res.send("✅ Your password has been reset! <a href='/'>Go to Login</a>");
});

// Logout
router.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect("/");
    });
});

// Test email route
router.get('/test-email', async (req, res) => {
    try {
        await sendEmail("test@example.com", "Test Email", "This is a test email from Nodemailer.");
        res.send("✅ Test email sent successfully.");
    } catch (error) {
        console.error("❌ Email Sending Error:", error);
        res.send("❌ Failed to send test email.");
    }
});

export default router;