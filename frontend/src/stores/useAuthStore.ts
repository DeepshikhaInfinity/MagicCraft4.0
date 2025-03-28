import express from 'express';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { dirname } from 'path';
passport.serializeUser((user: Express.User, done) => {
    done(null, user);
});

passport.deserializeUser((obj: Express.User, done) => {
    done(null, obj);
});

import { LogInCollection, LoginHistoryCollection } from './mongo';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

dotenv.config({ path: path.join(__dirname, '.env') });

const requiredEnvVars: string[] = [
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
    process.exit(1);
}

const oAuth2Client = new google.auth.OAuth2(
    process.env.EMAIL_CLIENT_ID!,
    process.env.EMAIL_CLIENT_SECRET!,
    "https://developers.google.com/oauthplayground"
);
oAuth2Client.setCredentials({ refresh_token: process.env.EMAIL_REFRESH_TOKEN! });

interface OTPData {
    code: string;
    expiry: number;
}

const otpStore = new Map<string, OTPData>();

async function createTransporter() {
    const accessToken = await oAuth2Client.getAccessToken();
    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            type: "OAuth2",
            user: process.env.EMAIL_USER!,
            clientId: process.env.EMAIL_CLIENT_ID!,
            clientSecret: process.env.EMAIL_CLIENT_SECRET!,
            refreshToken: process.env.EMAIL_REFRESH_TOKEN!,
            accessToken: accessToken.token as string
        }
    });
}

async function sendEmail(to: string, subject: string, htmlContent: string): Promise<void> {
    try {
        const transporter = await createTransporter();
        await transporter.sendMail({ from: process.env.EMAIL_USER!, to, subject, html: htmlContent });
    } catch (error) {
        console.error("❌ Email Sending Error:", error);
        throw error;
    }
}

function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function saveOTP(email: string, otp: string): void {
    otpStore.set(email, { code: otp, expiry: Date.now() + 5 * 60 * 1000 });
}

function verifyOTP(email: string, userSubmittedOTP: string): boolean {
    const otpData = otpStore.get(email);
    if (!otpData || Date.now() > otpData.expiry) {
        otpStore.delete(email);
        return false;
    }
    if (otpData.code !== userSubmittedOTP) return false;
    otpStore.delete(email);
    return true;
}

function validatePassword(password: string): boolean {
    return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[!@#$%^&*(),.?":{}|<>]/.test(password);
}

passport.serializeUser((user: Express.User, done) => {
    done(null, user);
});

passport.deserializeUser((obj: Express.User, done) => {
    done(null, obj);
});


passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: "/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await LogInCollection.findOne({ email: profile.emails?.[0].value });
        if (!user) {
            user = await LogInCollection.create({
                name: profile.displayName,
                email: profile.emails?.[0].value!,
                googleId: profile.id,
                verified: true
            });
        }
        return done(null, user);
    } catch (error) {
        return done(error, undefined);
    }
}));

export default router;
