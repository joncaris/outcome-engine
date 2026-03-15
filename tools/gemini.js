/**
 * Gemini AI Helper — Shared AI module for all Outcome Engine tools
 * Uses gemini-2.5-flash for cost efficiency + quality
 * Cost: ~$0.0003 per call vs $0.10 charge = 300x margin
 */

const { GoogleGenAI } = require('@google/genai');

const apiKey = process.env.GEMINI_API_KEY;
let ai = null;

function getClient() {
    if (!ai && apiKey) {
        ai = new GoogleGenAI({ apiKey });
    }
    return ai;
}

const MODEL = 'gemini-2.5-flash';

/**
 * Generate text from a prompt. Returns null if AI is unavailable.
 */
async function generateText(prompt, { maxTokens = 1024, temperature = 0.3 } = {}) {
    const client = getClient();
    if (!client) return null;

    try {
        const response = await client.models.generateContent({
            model: MODEL,
            contents: prompt,
            config: {
                maxOutputTokens: maxTokens,
                temperature,
            }
        });
        return response.text || null;
    } catch (error) {
        console.error('[GEMINI ERROR]', error.message);
        return null;
    }
}

/**
 * Generate structured JSON output from a prompt.
 * Falls back to null if AI unavailable or parsing fails.
 */
async function generateJSON(prompt, { maxTokens = 1024, temperature = 0.2 } = {}) {
    const client = getClient();
    if (!client) return null;

    try {
        const response = await client.models.generateContent({
            model: MODEL,
            contents: prompt + '\n\nRespond ONLY with valid JSON, no markdown, no code fences.',
            config: {
                maxOutputTokens: maxTokens,
                temperature,
                responseMimeType: 'application/json',
            }
        });

        const text = response.text;
        if (!text) return null;
        return JSON.parse(text);
    } catch (error) {
        console.error('[GEMINI JSON ERROR]', error.message);
        return null;
    }
}

function isAvailable() {
    return !!apiKey;
}

module.exports = { generateText, generateJSON, isAvailable, MODEL };
