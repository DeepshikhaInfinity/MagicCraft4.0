import mongoose, { Document, Schema } from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI is not defined in environment variables');
    process.exit(1);
}

async function connectToMongoDB(): Promise<void> {
    try {
        if (mongoose.connection.readyState === 1) {
            console.log('Database already connected');
            return;
        }

        await mongoose.connect(process.env.MONGO_URI!, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        } as mongoose.ConnectOptions);
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

interface ILogIn extends Document {
    name: string;
    email: string;
    password: string;
    verified?: boolean;
    createdAt?: Date;
    googleId?: string;
}

const logInSchema = new Schema<ILogIn>({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    verified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    googleId: { type: String, sparse: true }
});

interface ILoginHistory extends Document {
    email: string;
    loginTime?: Date;
}

const loginHistorySchema = new Schema<ILoginHistory>({
    email: { type: String, required: true },
    loginTime: { type: Date, default: Date.now }
});

interface IWordCache extends Document {
    first_word: string;
    second_word: string;
    emoji: string;
    translations: {
        en: string;
        hi: string;
        ta: string;
    };
}

const wordCacheSchema = new Schema<IWordCache>({
    first_word: String,
    second_word: String,
    emoji: String,
    translations: {
        en: String,
        hi: String,
        ta: String
    }
});

const LogInCollection = mongoose.model<ILogIn>('LogInCollection', logInSchema);
const LoginHistoryCollection = mongoose.model<ILoginHistory>('LoginHistoryCollection', loginHistorySchema);
const WordCache = mongoose.model<IWordCache>('WordCache', wordCacheSchema);

export { LogInCollection, LoginHistoryCollection, WordCache, connectToMongoDB };
