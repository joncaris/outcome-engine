/**
 * Category 10: DevOps & Monitoring Tools
 * - api_health_check: Multi-endpoint health monitoring
 * - compare_documents: AI diff/comparison of two texts
 */

const { generateJSON, isAvailable } = require('./gemini');

const definitions = [
    {
        name: 'api_health_check',
        description: 'Check health of one or more API endpoints. Returns status codes, response times, and availability reports. Only charges on VERIFIED_SUCCESS.',
        inputSchema: {
            type: 'object',
            properties: {
                endpoints: { type: 'array', items: { type: 'object', properties: { url: { type: 'string' }, method: { type: 'string' }, name: { type: 'string' } } }, description: 'List of endpoints to check' },
                timeout_ms: { type: 'number', description: 'Timeout per endpoint in milliseconds (default: 5000)' }
            },
            required: ['endpoints']
        }
    },
    {
        name: 'compare_documents',
        description: 'AI compares two text documents and identifies differences, similarities, and changes. Useful for contract diffs, version comparison. Only charges on VERIFIED_SUCCESS.',
        inputSchema: {
            type: 'object',
            properties: {
                text_a: { type: 'string', description: 'First document text' },
                text_b: { type: 'string', description: 'Second document text' },
                label_a: { type: 'string', description: 'Label for first document (default: "Document A")' },
                label_b: { type: 'string', description: 'Label for second document (default: "Document B")' },
                focus: { type: 'string', enum: ['all', 'additions', 'deletions', 'changes', 'sentiment_shift'], description: 'What to focus on (default: all)' }
            },
            required: ['text_a', 'text_b']
        }
    }
];

async function handleApiHealthCheck(args) {
    const { endpoints, timeout_ms = 5000 } = args;
    if (!endpoints || endpoints.length === 0) return { status: 'ERROR', error: 'endpoints array is required' };
    if (endpoints.length > 10) return { status: 'ERROR', error: 'Maximum 10 endpoints per check' };

    // SSRF protection
    const blocked = /^(https?:\/\/)?(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|0\.|localhost|metadata)/i;

    const results = await Promise.all(endpoints.map(async (ep) => {
        const url = ep.url;
        const name = ep.name || url;
        const method = (ep.method || 'GET').toUpperCase();

        if (blocked.test(url)) return { name, url, status: 'blocked', reason: 'Internal/private URL blocked' };

        const start = Date.now();
        try {
            const resp = await fetch(url, {
                method,
                headers: { 'User-Agent': 'OutcomeEngine-HealthCheck/1.0' },
                signal: AbortSignal.timeout(timeout_ms),
                redirect: 'follow'
            });
            const latency = Date.now() - start;
            return {
                name, url, status: resp.ok ? 'healthy' : 'degraded',
                http_status: resp.status, latency_ms: latency,
                headers: { 'content-type': resp.headers.get('content-type'), server: resp.headers.get('server') }
            };
        } catch (e) {
            return { name, url, status: 'down', error: e.message, latency_ms: Date.now() - start };
        }
    }));

    const healthy = results.filter(r => r.status === 'healthy').length;
    const total = results.length;
    const overallStatus = healthy === total ? 'all_healthy' : healthy === 0 ? 'all_down' : 'partial';

    return {
        status: 'VERIFIED_SUCCESS', tool: 'api_health_check',
        summary: { total, healthy, degraded: results.filter(r => r.status === 'degraded').length, down: results.filter(r => r.status === 'down').length, overall: overallStatus },
        endpoints: results, avg_latency_ms: Math.round(results.reduce((a, r) => a + (r.latency_ms || 0), 0) / total),
        timestamp: new Date().toISOString()
    };
}

async function handleCompareDocuments(args) {
    const { text_a, text_b, label_a = 'Document A', label_b = 'Document B', focus = 'all' } = args;
    if (!text_a || !text_b) return { status: 'ERROR', error: 'text_a and text_b are required' };
    if (!isAvailable()) return { status: 'FAILED', error: 'AI not available — GEMINI_API_KEY required' };

    const focusInst = focus === 'all' ? 'Identify all differences and similarities' :
        focus === 'additions' ? 'Focus on content added in Document B that is not in Document A' :
        focus === 'deletions' ? 'Focus on content in Document A that was removed in Document B' :
        focus === 'changes' ? 'Focus on content that was modified between the two' :
        'Focus on how the tone/sentiment changed between the two documents';

    const result = await generateJSON(
        `Compare these two documents. ${focusInst}

Return JSON:
{"similarity_score":0.0-1.0,"summary":"brief overall comparison","key_differences":[{"area":"","doc_a":"what A says","doc_b":"what B says","significance":"high|medium|low"}],"additions":["content only in B"],"deletions":["content only in A"],"unchanged_themes":["common themes"],"recommendation":"which document is stronger and why"}

--- ${label_a} ---
${text_a.substring(0, 3000)}

--- ${label_b} ---
${text_b.substring(0, 3000)}`,
        { maxTokens: 1024 }
    );

    if (!result || result.similarity_score === undefined) return { status: 'FAILED', error: 'Comparison failed' };

    return {
        status: 'VERIFIED_SUCCESS', tool: 'compare_documents',
        similarity_score: result.similarity_score, summary: result.summary,
        key_differences: result.key_differences, additions: result.additions, deletions: result.deletions,
        unchanged_themes: result.unchanged_themes, recommendation: result.recommendation,
        documents: { a: { label: label_a, length: text_a.length }, b: { label: label_b, length: text_b.length } },
        focus, ai_powered: true, timestamp: new Date().toISOString()
    };
}

const handlers = { api_health_check: handleApiHealthCheck, compare_documents: handleCompareDocuments };
module.exports = { definitions, handlers };
