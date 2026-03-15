/**
 * Abuse Protection Layer for Outcome Engine
 * 
 * Prevents compute abuse on pay-per-success model:
 * - Rate limiter: sliding window per user
 * - Circuit breaker: throttles users with <20% success rate
 */

class RateLimiter {
    constructor() {
        // Map of userId -> { calls: [timestamps], tier: 'free'|'pro' }
        this.store = new Map();
        this.limits = {
            free: { maxCalls: 5, windowMs: 60 * 1000 },    // 5 calls/min
            pro: { maxCalls: 30, windowMs: 60 * 1000 },     // 30 calls/min
            enterprise: { maxCalls: 100, windowMs: 60 * 1000 } // 100 calls/min
        };
        
        // Cleanup stale entries every 5 minutes
        setInterval(() => this._cleanup(), 5 * 60 * 1000);
    }

    check(userId, tier = 'free') {
        const now = Date.now();
        const limit = this.limits[tier] || this.limits.free;
        
        if (!this.store.has(userId)) {
            this.store.set(userId, { calls: [], tier });
        }
        
        const userData = this.store.get(userId);
        // Remove expired timestamps
        userData.calls = userData.calls.filter(t => now - t < limit.windowMs);
        
        if (userData.calls.length >= limit.maxCalls) {
            const oldestCall = userData.calls[0];
            const retryAfter = Math.ceil((oldestCall + limit.windowMs - now) / 1000);
            return { allowed: false, retryAfter, remaining: 0 };
        }
        
        userData.calls.push(now);
        return { allowed: true, remaining: limit.maxCalls - userData.calls.length };
    }

    _cleanup() {
        const now = Date.now();
        for (const [userId, data] of this.store.entries()) {
            data.calls = data.calls.filter(t => now - t < 120 * 1000);
            if (data.calls.length === 0) this.store.delete(userId);
        }
    }
}

class CircuitBreaker {
    constructor() {
        // Map of userId -> { successes: number, total: number, throttledUntil: timestamp }
        this.store = new Map();
        this.windowSize = 50;        // Evaluate over last 50 calls
        this.minSuccessRate = 0.20;  // 20% minimum success rate
        this.throttleDuration = 5 * 60 * 1000; // 5 min throttle
        
        setInterval(() => this._cleanup(), 10 * 60 * 1000);
    }

    check(userId) {
        const now = Date.now();
        const data = this.store.get(userId);
        
        if (!data) return { allowed: true };
        
        if (data.throttledUntil && now < data.throttledUntil) {
            const retryAfter = Math.ceil((data.throttledUntil - now) / 1000);
            return { allowed: false, retryAfter, reason: 'circuit_breaker' };
        }
        
        // Reset throttle if it's expired
        if (data.throttledUntil && now >= data.throttledUntil) {
            data.throttledUntil = null;
            data.successes = 0;
            data.total = 0;
        }
        
        return { allowed: true };
    }

    record(userId, success) {
        if (!this.store.has(userId)) {
            this.store.set(userId, { successes: 0, total: 0, throttledUntil: null });
        }
        
        const data = this.store.get(userId);
        data.total++;
        if (success) data.successes++;
        
        // Check if we should trip the breaker
        if (data.total >= this.windowSize) {
            const rate = data.successes / data.total;
            if (rate < this.minSuccessRate) {
                data.throttledUntil = Date.now() + this.throttleDuration;
                console.warn(`[CIRCUIT_BREAKER] User ${userId} throttled. Success rate: ${(rate * 100).toFixed(1)}% over ${data.total} calls`);
            }
            // Reset window
            data.successes = 0;
            data.total = 0;
        }
    }

    _cleanup() {
        const now = Date.now();
        for (const [userId, data] of this.store.entries()) {
            if (!data.throttledUntil && data.total === 0) {
                this.store.delete(userId);
            }
        }
    }
}

// Singleton instances
const rateLimiter = new RateLimiter();
const circuitBreaker = new CircuitBreaker();

// Per-tool timeout limits (milliseconds)
const TOOL_TIMEOUTS = {
    scrape_structured: 15000,
    extract_contact: 15000,
    verify_email: 5000,
    enrich_lead: 15000,
    run_and_validate: 5000,
    lint_and_fix: 15000,
    ocr_extract: 10000,
    classify_document: 15000,
    summarize_document: 15000,
    call_api_verified: 10000,
    webhook_delivery: 10000,
};

/**
 * Wraps a tool handler with rate limiting, circuit breaker, and timeout.
 * Returns a wrapped handler that returns MCP-compatible results.
 */
function withProtection(toolName, handler) {
    const timeout = TOOL_TIMEOUTS[toolName] || 10000;
    
    return async (args) => {
        const userId = args._userId || args._ip || 'anonymous';
        const tier = args._tier || 'free';
        
        // 1. Rate limit check
        const rateCheck = rateLimiter.check(userId, tier);
        if (!rateCheck.allowed) {
            return {
                status: 'RATE_LIMITED',
                error: `Rate limit exceeded. Retry in ${rateCheck.retryAfter}s.`,
                retryAfter: rateCheck.retryAfter,
            };
        }
        
        // 2. Circuit breaker check
        const circuitCheck = circuitBreaker.check(userId);
        if (!circuitCheck.allowed) {
            return {
                status: 'THROTTLED',
                error: `Too many failures. Throttled for ${circuitCheck.retryAfter}s. Improve your success rate.`,
                retryAfter: circuitCheck.retryAfter,
            };
        }
        
        // 3. Execute with timeout
        try {
            const result = await Promise.race([
                handler(args),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error(`Tool ${toolName} timed out after ${timeout}ms`)), timeout)
                )
            ]);
            
            // 4. Record outcome for circuit breaker
            const success = result.status === 'VERIFIED_SUCCESS';
            circuitBreaker.record(userId, success);
            
            return result;
        } catch (error) {
            circuitBreaker.record(userId, false);
            return {
                status: 'ERROR',
                error: error.message,
                tool: toolName,
            };
        }
    };
}

module.exports = { rateLimiter, circuitBreaker, withProtection, TOOL_TIMEOUTS };
