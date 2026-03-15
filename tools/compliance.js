/**
 * Category 9: Compliance & Security Tools (AI-Powered)
 * - detect_pii: Find PII in text (names, SSNs, CC#, emails, phones, addresses)
 */

const { generateJSON, isAvailable } = require('./gemini');

const definitions = [
    {
        name: 'detect_pii',
        description: 'AI scans text for Personally Identifiable Information (PII) — names, SSNs, credit cards, emails, phones, addresses, dates of birth. Critical for compliance (GDPR, CCPA, HIPAA). Only charges on VERIFIED_SUCCESS.',
        inputSchema: {
            type: 'object',
            properties: {
                text: { type: 'string', description: 'Text to scan for PII' },
                categories: { type: 'array', items: { type: 'string' }, description: 'PII categories to detect: "names", "ssn", "credit_card", "email", "phone", "address", "dob", "passport", "all" (default: all)' },
                redact: { type: 'boolean', description: 'Return a redacted version of the text (default: false)' }
            },
            required: ['text']
        }
    }
];

async function handleDetectPii(args) {
    const { text, categories = ['all'], redact = false } = args;
    if (!text || text.trim().length < 5) return { status: 'ERROR', error: 'text is required (min 5 chars)' };

    // Regex-based detection first (fast, always works)
    const regexFindings = [];
    const patterns = {
        email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        phone: /(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
        ssn: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,
        credit_card: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
        ip_address: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
    };

    const shouldCheck = (cat) => categories.includes('all') || categories.includes(cat);
    for (const [type, pattern] of Object.entries(patterns)) {
        if (shouldCheck(type)) {
            const matches = text.match(pattern);
            if (matches) matches.forEach(m => regexFindings.push({ type, value: m, method: 'regex' }));
        }
    }

    // AI-enhanced detection for harder PII
    let aiFindings = [];
    if (isAvailable()) {
        const catFilter = categories.includes('all') ? 'ALL categories' : categories.join(', ');
        const aiResult = await generateJSON(
            `Scan this text for Personally Identifiable Information (PII).

Categories to detect: ${catFilter}
Categories include: full names, social security numbers, credit card numbers, emails, phone numbers, physical addresses, dates of birth, passport numbers, driver's license numbers, medical record numbers, bank account numbers.

Return JSON:
{"findings":[{"type":"category name","value":"the PII found","context":"surrounding 5 words for context","severity":"high|medium|low","regulation":"GDPR|CCPA|HIPAA|PCI-DSS|none"}],"risk_level":"critical|high|medium|low|none","summary":"brief summary of findings"}

Text:
${text.substring(0, 5000)}`
        );

        if (aiResult && aiResult.findings) {
            aiFindings = aiResult.findings.map(f => ({ ...f, method: 'ai' }));
        }
    }

    // Merge and deduplicate findings
    const allFindings = [...regexFindings];
    for (const aif of aiFindings) {
        if (!allFindings.some(rf => rf.value === aif.value && rf.type === aif.type)) {
            allFindings.push(aif);
        }
    }

    // Optionally redact
    let redactedText;
    if (redact && allFindings.length > 0) {
        redactedText = text;
        for (const f of allFindings) {
            if (f.value) redactedText = redactedText.replace(new RegExp(f.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `[REDACTED_${f.type.toUpperCase()}]`);
        }
    }

    return {
        status: 'VERIFIED_SUCCESS', tool: 'detect_pii',
        pii_detected: allFindings.length > 0, finding_count: allFindings.length, findings: allFindings,
        risk_level: allFindings.length > 5 ? 'critical' : allFindings.length > 2 ? 'high' : allFindings.length > 0 ? 'medium' : 'none',
        redacted_text: redactedText, categories_scanned: categories,
        ai_powered: isAvailable(), timestamp: new Date().toISOString()
    };
}

const handlers = { detect_pii: handleDetectPii };
module.exports = { definitions, handlers };
