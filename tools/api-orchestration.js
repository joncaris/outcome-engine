/**
 * Category 5: API Orchestration Tools
 * - call_api_verified: Call a REST API and verify response
 * - webhook_delivery: Deliver a webhook payload and verify receipt
 * 
 * SECURITY: Blocks private IPs (SSRF protection), HTTPS only for call_api_verified
 */

const definitions = [
    {
        name: 'call_api_verified',
        description: 'Call a REST API endpoint and verify the response. Only charges on VERIFIED_SUCCESS when a 2xx response is received. HTTPS only, private IPs blocked.',
        inputSchema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'The HTTPS URL to call' },
                method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], description: 'HTTP method (default: GET)' },
                headers: { type: 'object', description: 'Request headers as key-value pairs', additionalProperties: { type: 'string' } },
                body: { type: 'string', description: 'Request body (for POST/PUT/PATCH)' },
                expected_status: { type: 'number', description: 'Expected HTTP status code (default: any 2xx)' }
            },
            required: ['url']
        }
    },
    {
        name: 'webhook_delivery',
        description: 'Deliver a JSON payload to a webhook URL and verify it was received (2xx response). Only charges on VERIFIED_SUCCESS.',
        inputSchema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'The webhook URL to deliver to' },
                payload: { type: 'object', description: 'The JSON payload to send' },
                expected_status: { type: 'number', description: 'Expected HTTP status (default: any 2xx)' }
            },
            required: ['url', 'payload']
        }
    }
];

// SSRF protection: block private/internal IPs
function isPrivateUrl(urlStr) {
    try {
        const url = new URL(urlStr);
        const hostname = url.hostname;
        // Block private IPs and localhost
        const blocked = [
            /^127\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./,
            /^0\./, /^169\.254\./, /^localhost$/i, /^\[::1\]$/, /^fc00:/i, /^fe80:/i
        ];
        return blocked.some(r => r.test(hostname));
    } catch { return true; }
}

async function handleCallApiVerified(args) {
    const { url, method = 'GET', headers = {}, body, expected_status } = args;
    if (!url) return { status: 'ERROR', error: 'URL is required' };

    // SSRF protection
    if (isPrivateUrl(url)) {
        return { status: 'ERROR', error: 'Private/internal URLs are blocked for security' };
    }

    // HTTPS enforcement
    if (!url.startsWith('https://')) {
        return { status: 'ERROR', error: 'Only HTTPS URLs are allowed' };
    }

    try {
        const startTime = Date.now();
        const fetchOpts = {
            method,
            headers: { 'User-Agent': 'OutcomeEngine/1.0', ...headers },
            signal: AbortSignal.timeout(9000)
        };
        if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
            fetchOpts.body = body;
            if (!headers['Content-Type'] && !headers['content-type']) {
                fetchOpts.headers['Content-Type'] = 'application/json';
            }
        }

        const response = await fetch(url, fetchOpts);
        const latencyMs = Date.now() - startTime;
        const responseText = await response.text();
        let responseData;
        try { responseData = JSON.parse(responseText); } catch { responseData = responseText.substring(0, 2000); }

        const isSuccess = expected_status
            ? response.status === expected_status
            : response.status >= 200 && response.status < 300;

        if (!isSuccess) {
            return {
                status: 'FAILED', tool: 'call_api_verified', url,
                http_status: response.status,
                expected: expected_status || '2xx',
                latency_ms: latencyMs,
                response_preview: typeof responseData === 'string' ? responseData.substring(0, 500) : responseData
            };
        }

        return {
            status: 'VERIFIED_SUCCESS', tool: 'call_api_verified', url,
            method, http_status: response.status, latency_ms: latencyMs,
            response_data: responseData,
            response_headers: {
                content_type: response.headers.get('content-type'),
                content_length: response.headers.get('content-length'),
            },
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return { status: 'FAILED', error: error.message, tool: 'call_api_verified', url };
    }
}

async function handleWebhookDelivery(args) {
    const { url, payload, expected_status } = args;
    if (!url) return { status: 'ERROR', error: 'URL is required' };
    if (!payload) return { status: 'ERROR', error: 'Payload is required' };

    if (isPrivateUrl(url)) {
        return { status: 'ERROR', error: 'Private/internal URLs are blocked for security' };
    }

    try {
        const startTime = Date.now();
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'OutcomeEngine-Webhook/1.0' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(9000)
        });
        const latencyMs = Date.now() - startTime;

        const isSuccess = expected_status
            ? response.status === expected_status
            : response.status >= 200 && response.status < 300;

        if (!isSuccess) {
            return {
                status: 'FAILED', tool: 'webhook_delivery', url,
                delivered: false, http_status: response.status, latency_ms: latencyMs
            };
        }

        return {
            status: 'VERIFIED_SUCCESS', tool: 'webhook_delivery', url,
            delivered: true, http_status: response.status, latency_ms: latencyMs,
            payload_size_bytes: JSON.stringify(payload).length,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return { status: 'FAILED', error: error.message, tool: 'webhook_delivery', url, delivered: false };
    }
}

const handlers = { call_api_verified: handleCallApiVerified, webhook_delivery: handleWebhookDelivery };
module.exports = { definitions, handlers };
