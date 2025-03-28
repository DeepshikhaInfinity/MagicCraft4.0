import Fastify from 'fastify'
import { fileURLToPath } from "url";
import path from "path";
import { LlamaChatSession, LlamaContext, LlamaJsonSchemaGrammar, LlamaModel } from "node-llama-cpp";
import cors from '@fastify/cors'
import axios from 'axios';
import authRoutes from './auth.js';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import fastifyPassport from '@fastify/passport';
import { WordCache, connectToMongoDB } from './mongo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to get sorted words for consistent storage
const getSortedWords = (word1, word2) => {
    return [word1, word2].sort();
};

// Language detection using script ranges
function detectLanguage(text) {
    if (!text) return 'en';
    
    const firstChar = text.charAt(0);
    const code = firstChar.charCodeAt(0);
    
    if (code >= 0x0900 && code <= 0x097F) return 'hi';  // Devanagari
    if (code >= 0x0B80 && code <= 0x0BFF) return 'ta';  // Tamil
    return 'en'; // Default to English
}

async function translate(text, sourceLang, targetLang) {
    if (!text || sourceLang === targetLang) return text;
    
    console.log(`Translating from ${sourceLang} to ${targetLang}: ${text}`);
    
    const url = "https://translate.googleapis.com/translate_a/single";
    const params = {
        client: 'gtx',
        sl: sourceLang,
        tl: targetLang,
        dt: 't',
        q: text
    };

    try {
        const response = await axios.get(url, { params });
        if (response.data && response.data[0] && response.data[0][0] && response.data[0][0][0]) {
            const translatedText = response.data[0][0][0];
            console.log(`Translation result: ${translatedText}`);
            return translatedText;
        }
        return text;
    } catch (error) {
        console.error(`Translation error (${sourceLang} to ${targetLang}):`, error.message);
        return text;
    }
}

async function craftNewWordFromCache(firstWord, secondWord, targetLang) {
    try {
        // Get sorted words for consistent lookup
        const [sortedWord1, sortedWord2] = getSortedWords(firstWord, secondWord);
        
        const cachedResult = await WordCache.findOne({
            first_word: sortedWord1,
            second_word: sortedWord2
        });

        if (cachedResult) {
            console.log('Found cached result:', cachedResult);
            
            // Get the translation for the target language
            const translation = cachedResult.translations[targetLang];
            
            if (translation) {
                console.log(`Using cached ${targetLang} translation`);
                return {
                    result: translation,
                    emoji: cachedResult.emoji
                };
            } else if (cachedResult.translations.en) {
                // If target language not available but English is, translate it
                console.log('Translating cached English result to', targetLang);
                const translatedResult = await translate(
                    cachedResult.translations.en,
                    'en',
                    targetLang
                );
                
                // Update cache with new translation
                cachedResult.translations[targetLang] = translatedResult;
                await cachedResult.save();
                
                return {
                    result: translatedResult,
                    emoji: cachedResult.emoji
                };
            }
        }
        console.log('No cache found for', firstWord, secondWord);
        return null;
    } catch (error) {
        console.error('Cache lookup error:', error);
        return null;
    }
}

async function cacheNewWord(firstWord, secondWord, result, emoji, language) {
    try {
        // Get sorted words for consistent storage
        const [sortedWord1, sortedWord2] = getSortedWords(firstWord, secondWord);
        
        let cacheEntry = await WordCache.findOne({
            first_word: sortedWord1,
            second_word: sortedWord2
        });

        if (!cacheEntry) {
            // For new entries, get translations for all supported languages
            const translations = {
                en: language === 'en' ? result : await translate(result, language, 'en'),
                hi: language === 'hi' ? result : await translate(result, language, 'hi'),
                ta: language === 'ta' ? result : await translate(result, language, 'ta')
            };

            // Create new entry with all translations
            cacheEntry = new WordCache({
                first_word: sortedWord1,
                second_word: sortedWord2,
                emoji: emoji,
                translations: translations
            });
        } else {
            // For existing entries, just update the specific language
            cacheEntry.translations[language] = result;
        }

        await cacheEntry.save();
        console.log(`Cached result for all languages successfully`);
    } catch (error) {
        console.error('Cache insertion error:', error);
    }
}

async function generateWord(firstWord, secondWord, session, grammar, context) {
    const systemPrompt =
        'You are a helpful assistant that helps people to craft new things by combining two words into a new word. ' +
        'The most important rules that you have to follow with every single answer that you are not allowed to use the words ' + firstWord + " and " + secondWord + ' as part of your answer and that you are only allowed to answer with one thing. ' +
        'DO NOT INCLUDE THE WORDS ' + firstWord + " and " + secondWord + ' as part of the answer!!!!! The words ' + firstWord + " and " + secondWord + ' may NOT be part of the answer. ' +
        'No sentences, no phrases, no multiple words, no punctuation, no special characters, no numbers, no emojis, no URLs, no code, no commands, no programming. ' +
        'The answer has to be a noun. ' +
        'The order of both words does not matter, both are equally important. ' +
        'The answer has to be related to both words and the context of the words. ' +
        'The answer can either be a combination of the words or the role of one word in relation to the other. ' +
        'Answers can be things, materials, people, companies, animals, occupations, food, places, objects, emotions, events, concepts, natural phenomena, body parts, vehicles, sports, clothing, furniture, technology, buildings, instruments, beverages, plants, academic subjects and everything else you can think of that is a noun.';

    const emojiSystemPrompt = 'Reply with one emoji that represents this word. Use the UTF-8 encoding.';
    const answerPrompt = 'Reply with the result of what would happen if you combine ' + firstWord + " and " + secondWord + '. The answer has to be related to both words and the context of the words and may not contain the words themselves. ';

    const prompt = '<s>[INST] ' +
        systemPrompt +
        answerPrompt + '[/INST]</s>\n';

    const result = await session.prompt(prompt, {
        grammar,
        maxTokens: context.getContextSize()
    });

    const emojiPrompt = '<s>[INST] ' +
        emojiSystemPrompt +
        JSON.parse(result).answer + '[/INST]</s>\n';

    const emojiResult = await session.prompt(emojiPrompt, {
        grammar,
        maxTokens: context.getContextSize()
    });

    if (JSON.parse(result).answer.toLowerCase().trim().split(' ').length > 3 ||
        (JSON.parse(result).answer.toLowerCase().includes(firstWord.toLowerCase()) &&
            JSON.parse(result).answer.toLowerCase().includes(secondWord.toLowerCase()) &&
            JSON.parse(result).answer.length < (firstWord.length + secondWord.length + 2))
    ) {
        return {result: '', emoji: ''};
    }

    return {
        result: capitalizeFirstLetter(JSON.parse(result).answer),
        emoji: JSON.parse(emojiResult).answer
    };
}

async function craftNewWord(firstWord, secondWord) {
    console.log(`Processing words: "${firstWord}", "${secondWord}"`);
    
    const sourceLang = detectLanguage(firstWord);
    console.log(`Detected source language: ${sourceLang}`);
    
    const firstWordEnglish = await translate(firstWord, sourceLang, 'en');
    const secondWordEnglish = await translate(secondWord, sourceLang, 'en');
    
    console.log(`English translations: "${firstWordEnglish}", "${secondWordEnglish}"`);

    // Check cache first
    const cachedResult = await craftNewWordFromCache(firstWordEnglish, secondWordEnglish, sourceLang);
    if (cachedResult) {
        console.log('Using cached result');
        return cachedResult;
    }

    // If not in cache, generate using LLM
    console.log('Generating new result using LLM');
    const model = new LlamaModel({
        modelPath: path.join(__dirname, "models", "mistral-7b-instruct-v0.1.Q8_0.gguf"),
    });
    const context = new LlamaContext({model, seed: 0});
    const session = new LlamaChatSession({context});

    const grammar = new LlamaJsonSchemaGrammar({
        "type": "object",
        "properties": {
            "answer": {
                "type": "string"
            }
        }
    });

    const result = await generateWord(firstWordEnglish, secondWordEnglish, session, grammar, context);
    
    // Generate result in English first
    await cacheNewWord(
        firstWordEnglish,
        secondWordEnglish,
        result.result,
        result.emoji,
        'en'
    );

    // Return the appropriate translation based on source language
    if (sourceLang !== 'en') {
        const cachedTranslation = await craftNewWordFromCache(firstWordEnglish, secondWordEnglish, sourceLang);
        if (cachedTranslation) {
            return cachedTranslation;
        }
    }

    return result;
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Initialize Fastify
const fastify = Fastify({
    logger: true,
    requestTimeout: 60 * 1000
});

// Register CORS
await fastify.register(cors, {
    credentials: true,
    origin: true
});

await fastify.register(fastifyCookie);
await fastify.register(fastifySession, {
    secret: process.env.SESSION_SECRET || 'a-very-secret-key',
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
});

await fastify.register(fastifyPassport.initialize());
await fastify.register(fastifyPassport.secureSession());

// Register auth routes
fastify.register(authRoutes, { prefix: '/auth' });

// Protect routes middleware
const isAuthenticated = async (request, reply) => {
    if (!request.session.user) {
        reply.code(401).send({ 
            error: 'Unauthorized', 
            message: 'Please log in to access this feature' 
        });
        return false;
    }
    return true;
};

// Route for public home page - accessible without login
fastify.route({
    method: 'GET',
    url: '/',
    handler: async (request, reply) => {
        reply.type('text/html').code(200);
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Word Combiner</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; max-width: 800px; margin: 0 auto; }
                h1 { color: #333; }
                .container { margin-top: 20px; }
                .card { background: #f9f9f9; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
                .login-container { margin-top: 30px; padding: 20px; background: #eee; border-radius: 8px; }
                input, button { padding: 8px; margin: 5px; }
                button { background: #4CAF50; color: white; border: none; cursor: pointer; }
                button:hover { background: #45a049; }
                a { color: #2196F3; text-decoration: none; }
                a:hover { text-decoration: underline; }
            </style>
        </head>
        <body>
            <h1>Word Combiner</h1>
            ${request.session.user ? 
              `<p>Welcome, ${request.session.user.name}! <a href="/auth/logout">Logout</a></p>` : 
              `<p>Create unique word combinations by combining two words.</p>
               <div class="login-container">
                   <h3>Login to create custom combinations</h3>
                   <form action="/auth/login" method="post">
                       <div><input type="email" name="email" placeholder="Email" required></div>
                       <div><input type="password" name="password" placeholder="Password" required></div>
                       <div><button type="submit">Login</button></div>
                   </form>
                   <p>Don't have an account? <a href="/signup">Sign up</a></p>
                   <p>Or <a href="/auth/google">Login with Google</a></p>
               </div>`
            }
            
            <div class="container">
                <h2>Sample Combinations</h2>
                <div class="card">
                    <p>जल + अग्नि</p>
                    <div id="result1">Loading...</div>
                </div>
                <div class="card">
                    <p>जल + पृथ्वी</p>
                    <div id="result2">Loading...</div>
                </div>
            </div>
            
            ${request.session.user ? 
              `<div class="create-container">
                   <h2>Create Your Own Combination</h2>
                   <form id="combiner-form">
                       <div><input type="text" id="word1" placeholder="First Word" required></div>
                       <div><input type="text" id="word2" placeholder="Second Word" required></div>
                       <div><button type="submit">Combine</button></div>
                   </form>
                   <div id="custom-result"></div>
               </div>` : 
               `<div class="card">
                   <p>Login to create your own word combinations!</p>
               </div>`
            }
            
            <script>
                // Fetch sample combinations
                fetch('/')
                    .then(response => response.json())
                    .then(data => {
                        document.getElementById('result1').textContent = 
                            data['जल + अग्नि'].emoji + ' ' + data['जल + अग्नि'].result;
                        document.getElementById('result2').textContent = 
                            data['जल + पृथ्वी'].emoji + ' ' + data['जल + पृथ्वी'].result;
                    });
                
                ${request.session.user ? 
                  `// Add event listener for custom combinations
                  document.getElementById('combiner-form').addEventListener('submit', async (e) => {
                      e.preventDefault();
                      const word1 = document.getElementById('word1').value;
                      const word2 = document.getElementById('word2').value;
                      
                      const response = await fetch('/', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ first: word1, second: word2 })
                      });
                      
                      const data = await response.json();
                      document.getElementById('custom-result').textContent = 
                          data.emoji + ' ' + data.result;
                  });` : ''
                }
            </script>
        </body>
        </html>
        `;
    }
});

// Route for signup page
fastify.route({
    method: 'GET',
    url: '/signup',
    handler: async (request, reply) => {
        reply.type('text/html').code(200);
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Sign Up - Word Combiner</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; max-width: 800px; margin: 0 auto; }
                h1 { color: #333; }
                .signup-container { margin-top: 30px; padding: 20px; background: #eee; border-radius: 8px; }
                input, button { padding: 8px; margin: 5px; width: 100%; box-sizing: border-box; }
                button { background: #4CAF50; color: white; border: none; cursor: pointer; }
                button:hover { background: #45a049; }
                a { color: #2196F3; text-decoration: none; }
                a:hover { text-decoration: underline; }
                .password-rules { font-size: 0.8em; color: #666; margin-top: 5px; }
            </style>
        </head>
        <body>
            <h1>Sign Up</h1>
            <div class="signup-container">
                <form action="/auth/signup" method="post">
                    <div><input type="text" name="name" placeholder="Full Name" required></div>
                    <div><input type="email" name="email" placeholder="Email" required></div>
                    <div>
                        <input type="password" name="password" id="password" placeholder="Password" required>
                        <p class="password-rules">
                            Password must be at least 8 characters long and include uppercase, lowercase, 
                            number, and special character.
                        </p>
                    </div>
                    <div><button type="submit">Sign Up</button></div>
                </form>
                <p>Already have an account? <a href="/">Login</a></p>
                <p>Or <a href="/auth/google">Sign up with Google</a></p>
            </div>
        </body>
        </html>
        `;
    }
});

// Add route for API endpoint with predefined combinations - Access without authentication
fastify.route({
    method: 'GET',
    url: '/api/sample-combinations',
    schema: {
        response: {
            200: {
                type: 'object',
                properties: {
                    'जल + अग्नि': {type: 'object'},
                    'जल + पृथ्वी': {type: 'object'},
                    'अग्नि + पृथ्वी': {type: 'object'},
                    'जल + वायु': {type: 'object'},
                    'पृथ्वी + वायु': {type: 'object'},
                    'अग्नि + वायु': {type: 'object'}
                }
            }
        },
    },
    handler: async (request, reply) => {
        reply.type('application/json').code(200);
        return {
            'जल + अग्नि': (await craftNewWord('जल', 'अग्नि')),
            'जल + पृथ्वी': (await craftNewWord('जल', 'पृथ्वी')),
            'अग्नि + पृथ्वी': (await craftNewWord('अग्नि', 'पृथ्वी')),
            'जल + वायु': (await craftNewWord('जल', 'वायु')),
            'पृथ्वी + वायु': (await craftNewWord('पृथ्वी', 'वायु')),
            'अग्नि + वायु': (await craftNewWord('अग्नि', 'वायु'))
        };
    }
});

// Add route for POST endpoint for custom word combinations - Requires authentication
fastify.route({
    method: 'POST',
    url: '/',
    //preValidation: isAuthenticated,
    schema: {
        body: {
            type: 'object',
            required: ['first', 'second'],
            properties: {
                first: { type: 'string' },
                second: { type: 'string' }
            }
        },
        response: {
            200: {
                type: 'object',
                properties: {
                    result: {type: 'string'},
                    emoji: {type: 'string'}
                }
            }
        }
    },
    handler: async (request, reply) => {
        const firstWord = request.body.first.trim();
        const secondWord = request.body.second.trim();
        
        reply.type('application/json').code(200);
        return await craftNewWord(firstWord, secondWord);
    }
});

// Dashboard route - requires authentication
fastify.route({
    method: 'GET',
    url: '/dashboard',
    preValidation: isAuthenticated,
    handler: async (request, reply) => {
        reply.type('text/html').code(200);
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Dashboard - Word Combiner</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; max-width: 800px; margin: 0 auto; }
                h1 { color: #333; }
                .container { margin-top: 20px; }
                .card { background: #f9f9f9; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
                input, button { padding: 8px; margin: 5px; }
                button { background: #4CAF50; color: white; border: none; cursor: pointer; }
                button:hover { background: #45a049; }
                a { color: #2196F3; text-decoration: none; }
                a:hover { text-decoration: underline; }
                .result-display { font-size: 24px; margin: 20px 0; padding: 15px; background: #e9f7ef; border-radius: 8px; text-align: center; }
            </style>
        </head>
        <body>
            <h1>Word Combiner Dashboard</h1>
            <p>Welcome, ${request.session.user.name}! <a href="/auth/logout">Logout</a></p>
            
            <div class="container">
                <h2>Create Word Combinations</h2>
                <form id="combiner-form">
                    <div><input type="text" id="word1" placeholder="First Word" required></div>
                    <div><input type="text" id="word2" placeholder="Second Word" required></div>
                    <div><button type="submit">Combine</button></div>
                </form>
                <div id="result" class="result-display">Your combined word will appear here</div>
            </div>
            
            <script>
                document.getElementById('combiner-form').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const word1 = document.getElementById('word1').value;
                    const word2 = document.getElementById('word2').value;
                    document.getElementById('result').textContent = 'Processing...';
                    
                    try {
                        const response = await fetch('/', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ first: word1, second: word2 })
                        });
                        
                        if (response.status === 401) {
                            document.getElementById('result').textContent = 'Please log in again';
                            window.location.href = '/';
                            return;
                        }
                        
                        const data = await response.json();
                        document.getElementById('result').textContent = data.emoji + ' ' + data.result;
                    } catch (error) {
                        document.getElementById('result').textContent = 'Error: ' + error.message;
                    }
                });
            </script>
        </body>
        </html>
        `;
    }
});

// Initialize database and start server
await connectToMongoDB();

try {
    await fastify.listen({port: 3000, host: '0.0.0.0'});
    console.log('Server started successfully');
} catch (err) {
    console.error('Server startup error:', err);
    process.exit(1);
}