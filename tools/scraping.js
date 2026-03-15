/**
 * Category 1: Web Scraping Tools (AI-Powered)
 * - scrape_structured: CSS + AI fallback for intelligent data extraction
 * - extract_contact: Regex + AI for finding non-standard contact formats
 */

const cheerio = require('cheerio');
const { generateJSON, isAvailable } = require('./gemini');

const definitions = [
    {
        name: 'scrape_structured',
        description: 'AI-powered structured data extraction from any URL. Uses CSS selectors with Gemini AI fallback for intelligent extraction when selectors miss. Only charges on VERIFIED_SUCCESS.',
        inputSchema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'The URL to scrape' },
                selectors: { type: 'object', description: 'Map of field names to CSS selectors (optional with AI mode)', additionalProperties: { type: 'string' } },
                fields: { type: 'array', items: { type: 'string' }, description: 'Field names to extract using AI (e.g., ["company_name", "pricing", "features"])' }
            },
            required: ['url']
        }
    },
    {
        name: 'extract_contact',
        description: 'AI-powered contact extraction from any web page. Finds emails, phones, social links, and non-standard formats (e.g., "john [at] company [dot] com"). Only charges on VERIFIED_SUCCESS.',
        inputSchema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'The URL to extract contact info from' }
            },
            required: ['url']
        }
    }
];

async function fetchPage(url) {
    const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OutcomeEngine/1.0)', 'Accept': 'text/html' },
        signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    return response.text();
}

async function handleScrapeStructured(args) {
    const { url, selectors, fields } = args;
    if (!url) return { status: 'ERROR', error: 'URL is required' };
    if (!selectors && !fields) return { status: 'ERROR', error: 'Provide selectors (CSS) or fields (AI extraction)' };

    try {
        const html = await fetchPage(url);
        const $ = cheerio.load(html);
        const data = {};
        let fieldsExtracted = 0;

        // Phase 1: CSS selector extraction
        if (selectors) {
            for (const [field, selector] of Object.entries(selectors)) {
                const elements = $(selector);
                if (elements.length > 0) {
                    data[field] = elements.length === 1 ? elements.text().trim() : elements.map((_, el) => $(el).text().trim()).get();
                    fieldsExtracted++;
                } else { data[field] = null; }
            }
        }

        // Phase 2: AI extraction for missing fields or AI-only mode
        const missingFields = selectors ? Object.entries(data).filter(([,v]) => v === null).map(([k]) => k) : [];
        const aiFields = fields || missingFields;

        if (aiFields.length > 0 && isAvailable()) {
            const pageText = $.text().replace(/\s+/g, ' ').substring(0, 4000);
            const aiResult = await generateJSON(
                `Extract the following fields from this web page text. Return a JSON object with each field as a key.\n\nFields to extract: ${aiFields.join(', ')}\n\nPage text:\n${pageText}`
            );
            if (aiResult) {
                for (const field of aiFields) {
                    if (aiResult[field] !== undefined && aiResult[field] !== null) {
                        data[field] = aiResult[field];
                        fieldsExtracted++;
                    }
                }
            }
        }

        if (fieldsExtracted === 0) return { status: 'FAILED', error: 'No data extracted', url };

        return {
            status: 'VERIFIED_SUCCESS', tool: 'scrape_structured', url, data,
            fields_extracted: fieldsExtracted, ai_powered: isAvailable(),
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return { status: 'FAILED', error: error.message, url };
    }
}

async function handleExtractContact(args) {
    const { url } = args;
    if (!url) return { status: 'ERROR', error: 'URL is required' };

    try {
        const html = await fetchPage(url);
        const $ = cheerio.load(html);
        const text = $.text();

        // Regex extraction
        const emails = [...new Set((text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []))]
            .filter(e => !e.includes('example.com') && !e.includes('sentry'));
        const phones = [...new Set((text.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || []))];

        const socials = {};
        const socialPatterns = {
            twitter: /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[a-zA-Z0-9_]+/g,
            linkedin: /https?:\/\/(?:www\.)?linkedin\.com\/(?:in|company)\/[a-zA-Z0-9_-]+/g,
            facebook: /https?:\/\/(?:www\.)?facebook\.com\/[a-zA-Z0-9._-]+/g,
            instagram: /https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9._-]+/g,
            github: /https?:\/\/(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/g,
        };
        for (const [platform, regex] of Object.entries(socialPatterns)) {
            const matches = [...new Set((html.match(regex) || []))];
            if (matches.length > 0) socials[platform] = matches;
        }

        // AI enhancement: find obfuscated contacts
        let aiContacts = null;
        if (isAvailable()) {
            const pageText = text.replace(/\s+/g, ' ').substring(0, 3000);
            aiContacts = await generateJSON(
                `Extract ALL contact information from this page. Find emails (including obfuscated like "name [at] domain [dot] com"), phone numbers, physical addresses, and contact names.\n\nReturn JSON: {"emails":[],"phones":[],"addresses":[],"contact_names":[],"additional_contacts":[]}\n\nPage text:\n${pageText}`
            );
            if (aiContacts) {
                if (aiContacts.emails) aiContacts.emails.forEach(e => { if (!emails.includes(e)) emails.push(e); });
                if (aiContacts.phones) aiContacts.phones.forEach(p => { if (!phones.includes(p)) phones.push(p); });
            }
        }

        const totalFound = emails.length + phones.length + Object.keys(socials).length;
        if (totalFound === 0) return { status: 'FAILED', error: 'No contact information found', url };

        return {
            status: 'VERIFIED_SUCCESS', tool: 'extract_contact', url,
            contacts: {
                emails, phones, socials,
                addresses: aiContacts?.addresses || [],
                contact_names: aiContacts?.contact_names || [],
            },
            total_found: totalFound, ai_enhanced: isAvailable(),
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return { status: 'FAILED', error: error.message, url };
    }
}

const handlers = { scrape_structured: handleScrapeStructured, extract_contact: handleExtractContact };
module.exports = { definitions, handlers };
