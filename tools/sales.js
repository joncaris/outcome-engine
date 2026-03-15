/**
 * Category 6: Sales Intelligence Tools (AI-Powered)
 * - generate_outreach_email: AI writes personalized cold emails
 * - analyze_competitor: AI competitive analysis from a URL
 */

const { generateText, generateJSON, isAvailable } = require('./gemini');

const definitions = [
    {
        name: 'generate_outreach_email',
        description: 'AI generates a personalized sales outreach email from lead data. Provide the prospect info and get a ready-to-send email. Only charges on VERIFIED_SUCCESS.',
        inputSchema: {
            type: 'object',
            properties: {
                prospect_name: { type: 'string', description: 'Name of the person you are emailing' },
                prospect_company: { type: 'string', description: 'Company name' },
                prospect_role: { type: 'string', description: 'Their job title/role' },
                your_product: { type: 'string', description: 'What you are selling/offering' },
                value_prop: { type: 'string', description: 'Key value proposition or pain point to address' },
                tone: { type: 'string', enum: ['professional', 'casual', 'friendly', 'urgent'], description: 'Email tone (default: professional)' },
                context: { type: 'string', description: 'Any additional context (recent news, mutual connection, etc.)' }
            },
            required: ['prospect_company', 'your_product']
        }
    },
    {
        name: 'analyze_competitor',
        description: 'AI analyzes a competitor website and returns SWOT analysis, positioning, pricing insights, and strategic recommendations. Only charges on VERIFIED_SUCCESS.',
        inputSchema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'Competitor website URL to analyze' },
                your_company: { type: 'string', description: 'Your company name (for comparison)' },
                your_industry: { type: 'string', description: 'Your industry for context' },
                focus: { type: 'string', enum: ['full', 'pricing', 'features', 'positioning', 'weaknesses'], description: 'Analysis focus (default: full)' }
            },
            required: ['url']
        }
    }
];

async function handleGenerateOutreachEmail(args) {
    const { prospect_name, prospect_company, prospect_role, your_product, value_prop, tone = 'professional', context } = args;
    if (!prospect_company || !your_product) return { status: 'ERROR', error: 'prospect_company and your_product are required' };
    if (!isAvailable()) return { status: 'FAILED', error: 'AI not available — GEMINI_API_KEY required' };

    const email = await generateJSON(
        `You are an expert B2B sales copywriter. Write a personalized cold outreach email.

Prospect: ${prospect_name || 'the decision maker'} at ${prospect_company}${prospect_role ? `, ${prospect_role}` : ''}
Product/Service: ${your_product}
Value Proposition: ${value_prop || 'Help them grow their business'}
Tone: ${tone}
${context ? `Additional Context: ${context}` : ''}

Return JSON:
{"subject":"compelling subject line","body":"the full email body with proper greeting and sign-off","follow_up_subject":"subject for a follow-up email if no response","follow_up_body":"shorter follow-up email body","tips":["1-2 tips for maximizing response rate"]}`
    );

    if (!email || !email.subject || !email.body) return { status: 'FAILED', error: 'AI could not generate email' };

    return {
        status: 'VERIFIED_SUCCESS', tool: 'generate_outreach_email',
        email: { subject: email.subject, body: email.body },
        follow_up: { subject: email.follow_up_subject, body: email.follow_up_body },
        tips: email.tips,
        prospect: { name: prospect_name, company: prospect_company, role: prospect_role },
        ai_powered: true, timestamp: new Date().toISOString()
    };
}

async function handleAnalyzeCompetitor(args) {
    const { url, your_company, your_industry, focus = 'full' } = args;
    if (!url) return { status: 'ERROR', error: 'URL is required' };
    if (!isAvailable()) return { status: 'FAILED', error: 'AI not available — GEMINI_API_KEY required' };

    let pageText = '';
    try {
        const resp = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OutcomeEngine/1.0)' },
            signal: AbortSignal.timeout(8000), redirect: 'follow'
        });
        if (!resp.ok) return { status: 'FAILED', error: `Could not fetch: HTTP ${resp.status}`, url };
        const html = await resp.text();
        pageText = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').substring(0, 5000);
    } catch (e) { return { status: 'FAILED', error: e.message, url }; }

    if (pageText.length < 100) return { status: 'FAILED', error: 'Not enough content to analyze', url };

    const focusInstruction = focus === 'full' ? 'Provide a complete competitive analysis' :
        focus === 'pricing' ? 'Focus specifically on their pricing strategy, tiers, and value proposition' :
        focus === 'features' ? 'Focus on their product features and capabilities' :
        focus === 'positioning' ? 'Focus on market positioning, messaging, and target audience' :
        'Focus on identifying their weaknesses and vulnerabilities';

    const analysis = await generateJSON(
        `You are a senior competitive intelligence analyst. Analyze this competitor's website.

URL: ${url}
${your_company ? `Your Company: ${your_company}` : ''}
${your_industry ? `Industry: ${your_industry}` : ''}
Focus: ${focusInstruction}

Return JSON:
{"company_name":"string","tagline":"their main tagline/headline","strengths":["list"],"weaknesses":["list"],"opportunities":["for your company against them"],"threats":["they pose to you"],"pricing_model":"what you can infer about pricing","target_market":"who they sell to","key_features":["list of main features"],"positioning":"how they position themselves","recommendations":["strategic recommendations for competing against them"],"risk_level":"low|medium|high - how much of a threat they are"}

Website text:
${pageText}`,
        { maxTokens: 1024 }
    );

    if (!analysis || !analysis.company_name) return { status: 'FAILED', error: 'AI analysis failed', url };

    return {
        status: 'VERIFIED_SUCCESS', tool: 'analyze_competitor',
        competitor: { url, name: analysis.company_name, tagline: analysis.tagline },
        swot: { strengths: analysis.strengths, weaknesses: analysis.weaknesses, opportunities: analysis.opportunities, threats: analysis.threats },
        insights: { pricing_model: analysis.pricing_model, target_market: analysis.target_market, key_features: analysis.key_features, positioning: analysis.positioning },
        recommendations: analysis.recommendations, risk_level: analysis.risk_level,
        ai_powered: true, timestamp: new Date().toISOString()
    };
}

const handlers = { generate_outreach_email: handleGenerateOutreachEmail, analyze_competitor: handleAnalyzeCompetitor };
module.exports = { definitions, handlers };
