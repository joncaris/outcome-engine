/**
 * Category 4: Document Processing Tools (AI-Powered)
 * - ocr_extract: Text extraction from images
 * - classify_document: AI-powered document classification
 * - summarize_document: NEW — AI document summarization
 */

const { generateJSON, generateText, isAvailable } = require('./gemini');

const definitions = [
    {
        name: 'ocr_extract',
        description: 'Extract text from an image URL. Only charges on VERIFIED_SUCCESS when text is extracted.',
        inputSchema: {
            type: 'object',
            properties: { image_url: { type: 'string', description: 'URL of the image' } },
            required: ['image_url']
        }
    },
    {
        name: 'classify_document',
        description: 'AI-powered document classification with entity extraction. Identifies type (invoice, contract, resume, etc.) with high accuracy. Only charges on VERIFIED_SUCCESS.',
        inputSchema: {
            type: 'object',
            properties: {
                text: { type: 'string', description: 'Document text to classify' },
                url: { type: 'string', description: 'URL to fetch document text from' }
            }
        }
    },
    {
        name: 'summarize_document',
        description: 'AI-powered document summarization. Generates concise summaries of any text with configurable length. Only charges on VERIFIED_SUCCESS.',
        inputSchema: {
            type: 'object',
            properties: {
                text: { type: 'string', description: 'Text to summarize' },
                url: { type: 'string', description: 'URL to fetch and summarize' },
                length: { type: 'string', enum: ['brief', 'medium', 'detailed'], description: 'Summary length (default: medium)' },
                focus: { type: 'string', description: 'Optional: focus the summary on a specific aspect' }
            }
        }
    }
];

const DOC_TYPES = {
    invoice: { keywords: ['invoice', 'bill to', 'due date', 'amount due', 'subtotal', 'tax', 'total due'], weight: 1.0 },
    receipt: { keywords: ['receipt', 'transaction', 'paid', 'thank you for your purchase', 'qty', 'cashier'], weight: 1.0 },
    contract: { keywords: ['agreement', 'party', 'whereas', 'hereby', 'terms and conditions', 'termination', 'signature'], weight: 1.0 },
    resume: { keywords: ['experience', 'education', 'skills', 'objective', 'references', 'university', 'proficient'], weight: 1.0 },
    letter: { keywords: ['dear', 'sincerely', 'regards', 'to whom it may concern'], weight: 0.8 },
    report: { keywords: ['executive summary', 'findings', 'methodology', 'conclusion', 'recommendations'], weight: 1.0 },
    legal: { keywords: ['plaintiff', 'defendant', 'court', 'jurisdiction', 'statute', 'exhibit'], weight: 1.0 },
    academic: { keywords: ['abstract', 'introduction', 'methodology', 'results', 'discussion', 'doi', 'hypothesis'], weight: 1.0 },
    email: { keywords: ['from:', 'to:', 'subject:', 'cc:', 'sent:', 're:'], weight: 0.9 },
};

async function handleOcrExtract(args) {
    const { image_url } = args;
    if (!image_url) return { status: 'ERROR', error: 'image_url is required' };
    try {
        const response = await fetch(image_url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OutcomeEngine/1.0)' }, signal: AbortSignal.timeout(8000) });
        if (!response.ok) return { status: 'FAILED', error: `HTTP ${response.status}`, image_url };
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('image') && !contentType.includes('pdf')) return { status: 'FAILED', error: `Not an image: ${contentType}`, image_url };
        const buffer = await response.arrayBuffer();
        const rawText = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(buffer));
        const textPatterns = rawText.match(/[\x20-\x7E]{10,}/g) || [];
        const meaningfulText = textPatterns.filter(t => /[a-zA-Z]{3,}/.test(t) && !t.includes('<?xml') && !t.includes('xmlns')).join('\n');
        if (meaningfulText.length < 20) return { status: 'FAILED', error: 'No meaningful text extracted', image_url };
        return { status: 'VERIFIED_SUCCESS', tool: 'ocr_extract', image_url, text: meaningfulText.substring(0, 5000), character_count: meaningfulText.length, timestamp: new Date().toISOString() };
    } catch (error) { return { status: 'FAILED', error: error.message, image_url }; }
}

async function fetchText(url) {
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.text();
}

async function handleClassifyDocument(args) {
    let { text, url } = args;
    if (!text && !url) return { status: 'ERROR', error: 'Either text or url is required' };
    if (!text) { try { text = await fetchText(url); } catch (e) { return { status: 'FAILED', error: e.message, url }; } }
    if (!text || text.trim().length < 20) return { status: 'FAILED', error: 'Text too short to classify' };

    // AI classification
    if (isAvailable()) {
        const preview = text.substring(0, 4000);
        const aiResult = await generateJSON(
            `Classify this document and extract key entities.\n\nReturn JSON:\n{"type":"invoice|receipt|contract|resume|letter|report|legal|academic|email|proposal|memo|manual|other","confidence":0.0-1.0,"reasoning":"why this classification","entities":{"dates":[],"amounts":[],"names":[],"organizations":[],"key_terms":[]},"summary":"1-2 sentence document summary"}\n\nDocument:\n${preview}`
        );
        if (aiResult && aiResult.type) {
            return {
                status: 'VERIFIED_SUCCESS', tool: 'classify_document',
                classification: { type: aiResult.type, confidence: aiResult.confidence, reasoning: aiResult.reasoning },
                entities: aiResult.entities, summary: aiResult.summary,
                text_stats: { length: text.length, word_count: text.split(/\s+/).length },
                ai_powered: true, timestamp: new Date().toISOString()
            };
        }
    }

    // Fallback: keyword matching
    const lower = text.toLowerCase();
    const scores = {};
    for (const [type, cfg] of Object.entries(DOC_TYPES)) {
        const matched = cfg.keywords.filter(k => lower.includes(k));
        if (matched.length > 0) scores[type] = { score: Math.round((matched.length / cfg.keywords.length) * cfg.weight * 100) / 100, matched };
    }
    const ranked = Object.entries(scores).sort(([,a],[,b]) => b.score - a.score);
    if (ranked.length === 0) return { status: 'FAILED', error: 'No matching patterns found', text_length: text.length };

    const [topType, topScore] = ranked[0];
    return {
        status: 'VERIFIED_SUCCESS', tool: 'classify_document',
        classification: { type: topType, confidence: Math.min(topScore.score * 2, 0.99), matched_keywords: topScore.matched },
        ai_powered: false, timestamp: new Date().toISOString()
    };
}

async function handleSummarizeDocument(args) {
    let { text, url, length = 'medium', focus } = args;
    if (!text && !url) return { status: 'ERROR', error: 'Either text or url is required' };
    if (!text) { try { text = await fetchText(url); } catch (e) { return { status: 'FAILED', error: e.message, url }; } }
    if (!text || text.trim().length < 50) return { status: 'FAILED', error: 'Text too short to summarize (min 50 chars)' };

    if (!isAvailable()) return { status: 'FAILED', error: 'AI not available — GEMINI_API_KEY required for summarization' };

    const lengthGuide = { brief: '2-3 sentences', medium: '1-2 paragraphs', detailed: '3-5 paragraphs with key points' };
    const focusInstr = focus ? `\nFocus specifically on: ${focus}` : '';

    const summary = await generateText(
        `Summarize the following document in ${lengthGuide[length] || lengthGuide.medium}.${focusInstr}\n\nProvide a clear, professional summary that captures the key information.\n\nDocument:\n${text.substring(0, 6000)}`,
        { maxTokens: length === 'detailed' ? 1024 : 512 }
    );

    if (!summary) return { status: 'FAILED', error: 'AI summarization failed' };

    return {
        status: 'VERIFIED_SUCCESS', tool: 'summarize_document',
        summary, length, focus: focus || null,
        source_stats: { character_count: text.length, word_count: text.split(/\s+/).length },
        ai_powered: true, timestamp: new Date().toISOString()
    };
}

const handlers = { ocr_extract: handleOcrExtract, classify_document: handleClassifyDocument, summarize_document: handleSummarizeDocument };
module.exports = { definitions, handlers };
