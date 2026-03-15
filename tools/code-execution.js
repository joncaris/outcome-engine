/**
 * Category 3: Code Execution & Validation (AI-Powered)
 * - run_and_validate: Sandboxed JS execution with output validation
 * - lint_and_fix: Gemini-powered code review with semantic bug detection
 */

const vm = require('vm');
const { generateJSON, isAvailable } = require('./gemini');

const definitions = [
    {
        name: 'run_and_validate',
        description: 'Execute JavaScript in a secure sandbox and validate output. Only charges on VERIFIED_SUCCESS when code runs without errors.',
        inputSchema: {
            type: 'object',
            properties: {
                code: { type: 'string', description: 'JavaScript code to execute' },
                expected_output: { type: 'string', description: 'Expected output to validate against' },
                test_cases: { type: 'array', items: { type: 'object', properties: { input: { type: 'string' }, expected: { type: 'string' } } }, description: 'Test cases to run' }
            },
            required: ['code']
        }
    },
    {
        name: 'lint_and_fix',
        description: 'AI-powered code review: Gemini finds semantic bugs, security vulnerabilities, performance issues, and anti-patterns. Returns fixes and improved code. Only charges on VERIFIED_SUCCESS.',
        inputSchema: {
            type: 'object',
            properties: {
                code: { type: 'string', description: 'Code to review (any language)' },
                language: { type: 'string', description: 'Programming language (default: javascript)' },
                focus: { type: 'string', enum: ['bugs', 'security', 'performance', 'all'], description: 'Review focus (default: all)' }
            },
            required: ['code']
        }
    }
];

function createSandbox() {
    const output = [];
    return {
        context: {
            console: { log: (...a) => output.push(a.map(String).join(' ')), error: (...a) => output.push('[ERROR] ' + a.map(String).join(' ')), warn: (...a) => output.push('[WARN] ' + a.map(String).join(' ')) },
            Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite,
            String, Number, Boolean, Array, Object, Map, Set, RegExp,
            Error, TypeError, RangeError, SyntaxError,
            setTimeout: undefined, setInterval: undefined, require: undefined, process: undefined, global: undefined,
        },
        output
    };
}

async function handleRunAndValidate(args) {
    const { code, expected_output, test_cases } = args;
    if (!code || !code.trim()) return { status: 'ERROR', error: 'Code is required' };

    const blocked = ['require(', 'import(', 'process.', 'child_process', '__proto__', 'constructor.constructor', 'Function(', 'eval('];
    for (const p of blocked) { if (code.includes(p)) return { status: 'ERROR', error: `Blocked: "${p}" not allowed` }; }

    try {
        const { context, output } = createSandbox();
        const returnValue = vm.runInNewContext(`(function() { ${code} })()`, vm.createContext(context), { timeout: 5000, displayErrors: true });
        const stdout = output.join('\n');
        const resultValue = returnValue !== undefined ? String(returnValue) : stdout;

        let validation = null;
        if (expected_output !== undefined) {
            validation = { passed: resultValue.trim() === expected_output.trim(), expected: expected_output, actual: resultValue.trim() };
        }

        let testResults = null;
        if (test_cases?.length > 0) {
            testResults = []; let passed = 0;
            for (const tc of test_cases) {
                try {
                    const { context: c, output: o } = createSandbox(); c.INPUT = tc.input;
                    const r = vm.runInNewContext(`(function() { ${code} })()`, vm.createContext(c), { timeout: 2000 });
                    const res = r !== undefined ? String(r) : o.join('\n');
                    const p = res.trim() === (tc.expected || '').trim();
                    if (p) passed++;
                    testResults.push({ input: tc.input, expected: tc.expected, actual: res.trim(), passed: p });
                } catch (e) { testResults.push({ input: tc.input, error: e.message, passed: false }); }
            }
            testResults = { total: test_cases.length, passed, failed: test_cases.length - passed, cases: testResults };
        }

        return { status: 'VERIFIED_SUCCESS', tool: 'run_and_validate', output: resultValue, stdout: stdout || null, validation, test_results: testResults, timestamp: new Date().toISOString() };
    } catch (error) {
        return { status: 'FAILED', error: error.message.includes('timed out') ? 'Execution timed out (5s limit)' : error.message, tool: 'run_and_validate' };
    }
}

async function handleLintAndFix(args) {
    const { code, language = 'javascript', focus = 'all' } = args;
    if (!code || !code.trim()) return { status: 'ERROR', error: 'Code is required' };

    // AI-powered code review
    if (isAvailable()) {
        const aiReview = await generateJSON(
            `You are a senior code reviewer. Review this ${language} code for ${focus === 'all' ? 'bugs, security vulnerabilities, performance issues, and anti-patterns' : focus}.\n\nReturn JSON:\n{"issues":[{"line":"number or null","severity":"error|warning|info","category":"bug|security|performance|style|best-practice","message":"description","fix":"suggested fix or null"}],"fixed_code":"the complete corrected code","summary":"1-2 sentence overall assessment","risk_score":"1-10 how risky this code is"}\n\nCode:\n\`\`\`${language}\n${code}\n\`\`\``
        );

        if (aiReview && aiReview.issues) {
            return {
                status: 'VERIFIED_SUCCESS', tool: 'lint_and_fix',
                issues_found: aiReview.issues.length,
                issues: aiReview.issues,
                severity_summary: {
                    errors: aiReview.issues.filter(i => i.severity === 'error').length,
                    warnings: aiReview.issues.filter(i => i.severity === 'warning').length,
                    info: aiReview.issues.filter(i => i.severity === 'info').length,
                },
                fixed_code: aiReview.fixed_code || null,
                summary: aiReview.summary,
                risk_score: aiReview.risk_score,
                ai_powered: true,
                language,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Fallback: regex-based linting
    const issues = [];
    const lines = code.split('\n');
    lines.forEach((line, i) => {
        if (/\bvar\s+/.test(line)) issues.push({ line: i+1, severity: 'warning', category: 'style', message: 'Use let/const instead of var', fix: line.replace(/\bvar\s+/, 'let ') });
        if (/[^!=]==[^=]/.test(line) && !line.includes('===')) issues.push({ line: i+1, severity: 'warning', category: 'bug', message: 'Use === instead of ==', fix: null });
        if (/console\.(log|debug)\(/.test(line)) issues.push({ line: i+1, severity: 'info', category: 'best-practice', message: 'Remove console.log for production', fix: null });
    });

    if (issues.length === 0) return { status: 'FAILED', error: 'No issues found', tool: 'lint_and_fix' };

    return {
        status: 'VERIFIED_SUCCESS', tool: 'lint_and_fix', issues_found: issues.length, issues,
        severity_summary: { errors: issues.filter(i => i.severity === 'error').length, warnings: issues.filter(i => i.severity === 'warning').length, info: issues.filter(i => i.severity === 'info').length },
        ai_powered: false, language, timestamp: new Date().toISOString()
    };
}

const handlers = { run_and_validate: handleRunAndValidate, lint_and_fix: handleLintAndFix };
module.exports = { definitions, handlers };
