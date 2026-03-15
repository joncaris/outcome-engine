/**
 * Category 2: Email & Lead Verification Tools (AI-Powered)
 * - verify_email: MX record + format validation
 * - enrich_lead: DNS intelligence + AI company summary
 */

const dns = require('dns');
const { promisify } = require('util');
const { generateJSON, isAvailable } = require('./gemini');

const resolveMx = promisify(dns.resolveMx);
const resolveTxt = promisify(dns.resolveTxt);
const resolve4 = promisify(dns.resolve4);

const definitions = [
    {
        name: 'verify_email',
        description: 'Verify if an email is deliverable via MX records, domain validation, and disposable email detection. Only charges on VERIFIED_SUCCESS.',
        inputSchema: {
            type: 'object',
            properties: { email: { type: 'string', description: 'Email address to verify' } },
            required: ['email']
        }
    },
    {
        name: 'enrich_lead',
        description: 'AI-powered lead enrichment: DNS intelligence + Gemini-generated company brief with industry, size, products, and ideal pitch angle. Only charges on VERIFIED_SUCCESS.',
        inputSchema: {
            type: 'object',
            properties: {
                email: { type: 'string', description: 'Email to enrich (extracts domain)' },
                domain: { type: 'string', description: 'Company domain to enrich' }
            }
        }
    }
];

const DISPOSABLE = new Set(['mailinator.com','guerrillamail.com','tempmail.com','throwaway.email','yopmail.com','sharklasers.com','dispostable.com','trashmail.com','temp-mail.org']);
const FREE_PROVIDERS = new Set(['gmail.com','yahoo.com','hotmail.com','outlook.com','aol.com','icloud.com','mail.com','protonmail.com','zoho.com','live.com']);

async function handleVerifyEmail(args) {
    const { email } = args;
    if (!email) return { status: 'ERROR', error: 'Email is required' };

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
        return { status: 'VERIFIED_SUCCESS', tool: 'verify_email', email, valid: false, reason: 'invalid_format', timestamp: new Date().toISOString() };
    }

    const [, domain] = email.split('@');
    const isDisposable = DISPOSABLE.has(domain.toLowerCase());
    const isFree = FREE_PROVIDERS.has(domain.toLowerCase());

    let mxRecords = [], hasMx = false, mxHost = null;
    try { mxRecords = await resolveMx(domain); hasMx = mxRecords.length > 0; if (hasMx) { mxRecords.sort((a,b) => a.priority - b.priority); mxHost = mxRecords[0].exchange; } } catch (_) {}
    let hasA = false;
    try { await resolve4(domain); hasA = true; } catch (_) {}
    let spf = null;
    try { const txt = await resolveTxt(domain); spf = txt.flat().find(r => r.startsWith('v=spf1')); } catch (_) {}

    if (!hasMx && !hasA) {
        return { status: 'VERIFIED_SUCCESS', tool: 'verify_email', email, valid: false, reason: 'domain_not_found', details: { has_mx: false, has_a_record: false, domain }, timestamp: new Date().toISOString() };
    }

    return {
        status: 'VERIFIED_SUCCESS', tool: 'verify_email', email,
        valid: hasMx, reason: hasMx ? 'mx_verified' : 'no_mx_records',
        confidence: hasMx ? (isDisposable ? 0.5 : 0.9) : 0.1,
        details: { format_valid: true, has_mx: hasMx, mx_host: mxHost, mx_count: mxRecords.length, has_a_record: hasA, is_disposable: isDisposable, is_free_provider: isFree, has_spf: !!spf, domain },
        timestamp: new Date().toISOString()
    };
}

async function handleEnrichLead(args) {
    const { email, domain: inputDomain } = args;
    if (!email && !inputDomain) return { status: 'ERROR', error: 'Either email or domain is required' };
    const domain = inputDomain || email.split('@')[1];
    if (!domain) return { status: 'ERROR', error: 'Could not extract domain' };

    try {
        let mxRecords = [], txtRecords = [], hasWebsite = false;
        try { mxRecords = await resolveMx(domain); } catch (_) {}
        try { txtRecords = (await resolveTxt(domain)).flat(); } catch (_) {}
        try { await resolve4(domain); hasWebsite = true; } catch (_) {}

        if (!hasWebsite && mxRecords.length === 0) return { status: 'FAILED', error: 'Domain does not resolve', domain };

        // Detect services from TXT records
        const services = [];
        const txt = txtRecords.join(' ');
        if (txt.includes('google')) services.push('Google Workspace');
        if (txt.includes('microsoft') || txt.includes('outlook')) services.push('Microsoft 365');
        if (txt.includes('salesforce')) services.push('Salesforce');
        if (txt.includes('hubspot')) services.push('HubSpot');
        if (txt.includes('zendesk')) services.push('Zendesk');
        if (txt.includes('slack')) services.push('Slack');
        if (txt.includes('atlassian')) services.push('Atlassian');
        if (txt.includes('stripe')) services.push('Stripe');

        // Email provider from MX
        let emailProvider = 'unknown';
        if (mxRecords.length > 0) {
            const mx = mxRecords.sort((a,b) => a.priority - b.priority)[0].exchange.toLowerCase();
            if (mx.includes('google') || mx.includes('gmail')) emailProvider = 'Google Workspace';
            else if (mx.includes('outlook') || mx.includes('microsoft')) emailProvider = 'Microsoft 365';
            else if (mx.includes('zoho')) emailProvider = 'Zoho Mail';
            else emailProvider = 'Self-hosted / Other';
        }

        // Fetch website for AI analysis
        let companyName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
        let pageText = '';
        try {
            const resp = await fetch(`https://${domain}`, {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OutcomeEngine/1.0)' },
                signal: AbortSignal.timeout(4000), redirect: 'follow'
            });
            if (resp.ok) {
                const html = await resp.text();
                const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
                if (titleMatch) companyName = titleMatch[1].trim().split(/[|\-–—]/)[0].trim();
                pageText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').substring(0, 4000);
            }
        } catch (_) {}

        // AI-powered company brief
        let aiBrief = null;
        if (isAvailable() && pageText.length > 50) {
            aiBrief = await generateJSON(
                `You are a sales intelligence analyst. Analyze this company's website text and generate a sales-ready company brief.\n\nCompany domain: ${domain}\nDetected services they use: ${services.join(', ') || 'none detected'}\n\nReturn JSON:\n{"industry":"string","company_description":"1-2 sentence summary","products_or_services":["list"],"estimated_employees":"range like 10-50","target_market":"who they sell to","ideal_pitch_angle":"how to approach them as a prospect","tech_stack_indicators":["from what you can see"],"key_differentiator":"what makes them unique"}\n\nWebsite text:\n${pageText}`
            );
        }

        let estimatedSize = services.length >= 5 ? 'enterprise' : services.length >= 3 ? 'mid-market' : services.length >= 1 ? 'small-business' : 'micro';

        return {
            status: 'VERIFIED_SUCCESS', tool: 'enrich_lead', domain,
            company: { name: companyName, domain, estimated_size: estimatedSize, email_provider: emailProvider, detected_services: services, has_website: hasWebsite },
            ai_brief: aiBrief,
            ai_powered: isAvailable() && !!aiBrief,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return { status: 'FAILED', error: error.message, domain };
    }
}

const handlers = { verify_email: handleVerifyEmail, enrich_lead: handleEnrichLead };
module.exports = { definitions, handlers };
