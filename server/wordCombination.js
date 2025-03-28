// wordCombination.js
import mongoose from "mongoose";

// Schema for word combinations
const wordCombinationSchema = new mongoose.Schema({
    firstWord: {
        type: String,
        required: true,
    },
    secondWord: {
        type: String,
        required: true,
    },
    result: {
        type: String,
        required: true,
    },
    emoji: {
        type: String,
        required: true,
    },
    language: {
        type: String,
        required: true,
        default: 'en'
    }
}, {
    timestamps: true
});

// Create compound index for faster lookups
wordCombinationSchema.index({ firstWord: 1, secondWord: 1 }, { unique: true });

export const WordCombination = mongoose.model('WordCombination', wordCombinationSchema);

// Modified functions to use MongoDB instead of SQLite
export async function craftNewWordFromCache(firstWord, secondWord, targetLang) {
    try {
        // Try both word orders
        let cachedResult = await WordCombination.findOne({
            $or: [
                { firstWord, secondWord },
                { firstWord: secondWord, secondWord: firstWord }
            ]
        });

        if (cachedResult) {
            console.log('Found cached result:', cachedResult);
            // If cached result is in a different language, translate it
            if (cachedResult.language !== targetLang) {
                cachedResult.result = await translate(
                    cachedResult.result,
                    'en',  // Cache always stores English results
                    targetLang
                );
            }
            return {
                result: cachedResult.result,
                emoji: cachedResult.emoji,
                language: cachedResult.language
            };
        }
        return null;
    } catch (error) {
        console.error('Cache lookup error:', error);
        return null;
    }
}

export async function cacheNewWord(firstWord, secondWord, result, emoji, language) {
    try {
        const newCombination = new WordCombination({
            firstWord,
            secondWord,
            result,
            emoji,
            language
        });
        
        await newCombination.save();
        console.log('Cached new result successfully');
    } catch (error) {
        console.error('Cache insertion error:', error);
        // If duplicate key error, update the existing record
        if (error.code === 11000) {
            try {
                await WordCombination.findOneAndUpdate(
                    { firstWord, secondWord },
                    { result, emoji, language },
                    { new: true }
                );
                console.log('Updated existing cache entry');
            } catch (updateError) {
                console.error('Cache update error:', updateError);
            }
        }
    }
}