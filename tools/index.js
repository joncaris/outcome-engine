/**
 * Tool Registry — Central hub for all Outcome Engine tools.
 * Aggregates definitions and handlers from all category modules and
 * wraps each handler with abuse protection (rate limiting + circuit breaker).
 */

const { withProtection } = require('./abuse-protection');
const scraping = require('./scraping');
const email = require('./email');
const codeExecution = require('./code-execution');
const document = require('./document');
const apiOrchestration = require('./api-orchestration');
const sales = require('./sales');
const data = require('./data');
const content = require('./content');
const compliance = require('./compliance');
const devops = require('./devops');

// Collect all modules
const modules = [scraping, email, codeExecution, document, apiOrchestration, sales, data, content, compliance, devops];

// Build unified definitions array
const allDefinitions = modules.flatMap(m => m.definitions);

// Build unified handlers map, each wrapped with abuse protection
const allHandlers = {};
for (const mod of modules) {
    for (const [name, handler] of Object.entries(mod.handlers)) {
        allHandlers[name] = withProtection(name, handler);
    }
}

module.exports = { definitions: allDefinitions, handlers: allHandlers };

