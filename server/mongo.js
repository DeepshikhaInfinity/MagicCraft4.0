import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '.env') });

// Verify MONGO_URI is available
if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI is not defined in environment variables');
    process.exit(1);
}

// Connect to MongoDB
async function connectToMongoDB() {
    try {
        if (mongoose.connection.readyState === 1) {
            console.log('Database already connected');
            return;
        }
        
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}


// Define schemas
const logInSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    verified: { 
        type: Boolean, 
        default: false 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    googleId: {
        type: String,
        sparse: true
    }
});

const loginHistorySchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: true 
    },
    loginTime: { 
        type: Date, 
        default: Date.now 
    }
});

// Word cache schema
const wordCacheSchema = new mongoose.Schema({
    first_word: String,
    second_word: String,
    emoji: String,
    translations: {
        en: String,
        hi: String,
        ta: String
    }
});

export const LogInCollection = mongoose.model('LogInCollection', logInSchema);
export const LoginHistoryCollection = mongoose.model('LoginHistoryCollection', loginHistorySchema);
export const WordCache = mongoose.model('WordCache', wordCacheSchema);
export { connectToMongoDB };