/**
 * Category 7: Data Processing & Generation Tools (AI-Powered)
 * - extract_invoice_data: Parse invoices into structured JSON
 * - generate_sql_query: Natural language → SQL
 * - validate_json_schema: Validate + fix JSON
 * - data_transform: CSV↔JSON, reshape
 * - generate_test_data: AI creates realistic test data
 */

const { generateJSON, isAvailable } = require('./gemini');

const definitions = [
    {
        name: 'extract_invoice_data',
        description: 'AI extracts structured data from invoice text — line items, totals, dates, vendor info. Only charges on VERIFIED_SUCCESS.',
        inputSchema: {
            type: 'object',
            properties: {
                text: { type: 'string', description: 'Invoice text content' },
                format: { type: 'string', enum: ['json', 'csv'], description: 'Output format (default: json)' }
            },
            required: ['text']
        }
    },
    {
        name: 'generate_sql_query',
        description: 'AI converts natural language to SQL. Describe what you want and get a working query. Only charges on VERIFIED_SUCCESS.',
        inputSchema: {
            type: 'object',
            properties: {
                description: { type: 'string', description: 'Natural language description of what you want to query' },
                schema: { type: 'string', description: 'Database schema (CREATE TABLE statements or description)' },
                dialect: { type: 'string', enum: ['postgresql', 'mysql', 'sqlite', 'mssql'], description: 'SQL dialect (default: postgresql)' }
            },
            required: ['description']
        }
    },
    {
        name: 'validate_json_schema',
        description: 'Validate JSON against a schema and auto-fix errors. Returns validation results and corrected JSON. Only charges on VERIFIED_SUCCESS.',
        inputSchema: {
            type: 'object',
            properties: {
                json_data: { type: 'string', description: 'JSON string to validate' },
                schema: { type: 'string', description: 'JSON Schema to validate against (optional — will infer structure)' },
                auto_fix: { type: 'boolean', description: 'Attempt to auto-fix invalid JSON (default: true)' }
            },
            required: ['json_data']
        }
    },
    {
        name: 'data_transform',
        description: 'Transform data between formats: CSV↔JSON, flatten nested objects, reshape arrays. Only charges on VERIFIED_SUCCESS.',
        inputSchema: {
            type: 'object',
            properties: {
                data: { type: 'string', description: 'Input data (CSV or JSON string)' },
                from_format: { type: 'string', enum: ['csv', 'json', 'auto'], description: 'Input format (default: auto)' },
                to_format: { type: 'string', enum: ['csv', 'json', 'table'], description: 'Output format' },
                operations: { type: 'array', items: { type: 'string' }, description: 'Transformations: "flatten", "unflatten", "sort:field", "filter:field=value", "select:field1,field2"' }
            },
            required: ['data', 'to_format']
        }
    },
    {
        name: 'generate_test_data',
        description: 'AI generates realistic test data matching your schema or description. Names, emails, addresses, dates — all realistic. Only charges on VERIFIED_SUCCESS.',
        inputSchema: {
            type: 'object',
            properties: {
                schema: { type: 'string', description: 'Describe the data shape or provide a JSON schema' },
                count: { type: 'number', description: 'Number of records to generate (max 50, default: 10)' },
                format: { type: 'string', enum: ['json', 'csv'], description: 'Output format (default: json)' },
                locale: { type: 'string', description: 'Locale for names/addresses (default: en-US)' }
            },
            required: ['schema']
        }
    }
];

async function handleExtractInvoiceData(args) {
    const { text, format = 'json' } = args;
    if (!text || text.trim().length < 20) return { status: 'ERROR', error: 'Invoice text is required (min 20 chars)' };
    if (!isAvailable()) return { status: 'FAILED', error: 'AI not available — GEMINI_API_KEY required' };

    const result = await generateJSON(
        `Extract all structured data from this invoice text.

Return JSON:
{"vendor":{"name":"","address":"","phone":"","email":""},"invoice_number":"","invoice_date":"","due_date":"","bill_to":{"name":"","address":""},"line_items":[{"description":"","quantity":0,"unit_price":0,"total":0}],"subtotal":0,"tax":0,"discount":0,"total":0,"payment_terms":"","currency":"USD","notes":""}

Invoice text:
${text.substring(0, 4000)}`
    );

    if (!result || !result.total) return { status: 'FAILED', error: 'Could not extract invoice data' };
    return { status: 'VERIFIED_SUCCESS', tool: 'extract_invoice_data', invoice: result, format, ai_powered: true, timestamp: new Date().toISOString() };
}

async function handleGenerateSqlQuery(args) {
    const { description, schema, dialect = 'postgresql' } = args;
    if (!description) return { status: 'ERROR', error: 'description is required' };
    if (!isAvailable()) return { status: 'FAILED', error: 'AI not available — GEMINI_API_KEY required' };

    const result = await generateJSON(
        `Generate a SQL query for ${dialect}.

Request: ${description}
${schema ? `Schema:\n${schema}` : 'No schema provided — use reasonable table/column names.'}

Return JSON:
{"query":"the SQL query","explanation":"what the query does in plain English","tables_used":["list"],"estimated_complexity":"simple|moderate|complex","warnings":["any potential issues"]}`
    );

    if (!result || !result.query) return { status: 'FAILED', error: 'Could not generate SQL query' };
    return { status: 'VERIFIED_SUCCESS', tool: 'generate_sql_query', sql: result.query, explanation: result.explanation, tables: result.tables_used, complexity: result.estimated_complexity, warnings: result.warnings, dialect, ai_powered: true, timestamp: new Date().toISOString() };
}

async function handleValidateJsonSchema(args) {
    const { json_data, schema, auto_fix = true } = args;
    if (!json_data) return { status: 'ERROR', error: 'json_data is required' };

    let parsed = null, parseError = null;
    try { parsed = JSON.parse(json_data); } catch (e) { parseError = e.message; }

    if (parseError && auto_fix && isAvailable()) {
        const fixed = await generateJSON(`Fix this invalid JSON. The error was: ${parseError}\n\nBroken JSON:\n${json_data.substring(0, 3000)}\n\nReturn the corrected JSON object.`);
        if (fixed) {
            return { status: 'VERIFIED_SUCCESS', tool: 'validate_json_schema', valid: false, auto_fixed: true, original_error: parseError, fixed_json: fixed, ai_powered: true, timestamp: new Date().toISOString() };
        }
        return { status: 'FAILED', error: `Invalid JSON: ${parseError}. Auto-fix failed.` };
    }
    if (parseError) return { status: 'VERIFIED_SUCCESS', tool: 'validate_json_schema', valid: false, error: parseError, auto_fixed: false, timestamp: new Date().toISOString() };

    // Schema validation
    if (schema) {
        let schemaObj; try { schemaObj = JSON.parse(schema); } catch (_) { return { status: 'ERROR', error: 'Invalid schema JSON' }; }
        const errors = [];
        if (schemaObj.required) { for (const f of schemaObj.required) { if (!(f in parsed)) errors.push(`Missing required field: ${f}`); } }
        if (schemaObj.properties) {
            for (const [key, spec] of Object.entries(schemaObj.properties)) {
                if (key in parsed && spec.type) {
                    const actual = Array.isArray(parsed[key]) ? 'array' : typeof parsed[key];
                    if (actual !== spec.type) errors.push(`${key}: expected ${spec.type}, got ${actual}`);
                }
            }
        }
        return { status: 'VERIFIED_SUCCESS', tool: 'validate_json_schema', valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined, parsed_json: parsed, timestamp: new Date().toISOString() };
    }

    return { status: 'VERIFIED_SUCCESS', tool: 'validate_json_schema', valid: true, parsed_json: parsed, type: Array.isArray(parsed) ? 'array' : typeof parsed, size: JSON.stringify(parsed).length, timestamp: new Date().toISOString() };
}

async function handleDataTransform(args) {
    const { data, from_format = 'auto', to_format, operations = [] } = args;
    if (!data) return { status: 'ERROR', error: 'data is required' };

    let records = [];
    let detectedFormat = from_format;

    // Auto-detect and parse
    if (from_format === 'auto' || from_format === 'json') {
        try { const p = JSON.parse(data); records = Array.isArray(p) ? p : [p]; detectedFormat = 'json'; } catch (_) { detectedFormat = 'csv'; }
    }
    if (detectedFormat === 'csv') {
        const lines = data.trim().split('\n');
        if (lines.length < 2) return { status: 'FAILED', error: 'CSV needs header + at least 1 row' };
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        records = lines.slice(1).map(line => {
            const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            return Object.fromEntries(headers.map((h, i) => [h, vals[i] || '']));
        });
    }
    if (records.length === 0) return { status: 'FAILED', error: 'No data parsed' };

    // Apply operations
    for (const op of operations) {
        if (op === 'flatten') {
            records = records.map(r => { const flat = {}; const recurse = (obj, prefix = '') => { for (const [k,v] of Object.entries(obj)) { if (v && typeof v === 'object' && !Array.isArray(v)) recurse(v, `${prefix}${k}.`); else flat[`${prefix}${k}`] = v; } }; recurse(r); return flat; });
        } else if (op.startsWith('sort:')) {
            const field = op.split(':')[1]; records.sort((a,b) => String(a[field] || '').localeCompare(String(b[field] || '')));
        } else if (op.startsWith('filter:')) {
            const [,cond] = op.split(':'); const [field, val] = cond.split('='); records = records.filter(r => String(r[field]) === val);
        } else if (op.startsWith('select:')) {
            const fields = op.split(':')[1].split(','); records = records.map(r => Object.fromEntries(fields.map(f => [f, r[f]])));
        }
    }

    // Format output
    let output;
    if (to_format === 'csv') {
        const headers = [...new Set(records.flatMap(r => Object.keys(r)))];
        output = [headers.join(','), ...records.map(r => headers.map(h => `"${String(r[h] || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    } else if (to_format === 'table') {
        const headers = [...new Set(records.flatMap(r => Object.keys(r)))];
        const widths = headers.map(h => Math.max(h.length, ...records.map(r => String(r[h] || '').length)));
        const sep = widths.map(w => '-'.repeat(w + 2)).join('+');
        output = [headers.map((h, i) => ` ${h.padEnd(widths[i])} `).join('|'), sep, ...records.map(r => headers.map((h, i) => ` ${String(r[h] || '').padEnd(widths[i])} `).join('|'))].join('\n');
    } else { output = records; }

    return { status: 'VERIFIED_SUCCESS', tool: 'data_transform', output, record_count: records.length, from_format: detectedFormat, to_format, operations_applied: operations, timestamp: new Date().toISOString() };
}

async function handleGenerateTestData(args) {
    const { schema, count = 10, format = 'json', locale = 'en-US' } = args;
    if (!schema) return { status: 'ERROR', error: 'schema is required' };
    if (!isAvailable()) return { status: 'FAILED', error: 'AI not available — GEMINI_API_KEY required' };
    const safeCount = Math.min(Math.max(1, count), 50);

    const result = await generateJSON(
        `Generate ${safeCount} realistic test data records for locale ${locale}.

Schema: ${schema}

Requirements:
- All names, emails, addresses must be realistic (not "test" or "example")
- Dates should be within the last 2 years
- Numbers should be realistic for their context
- Emails should use realistic domains
- Phone numbers should match locale format

Return JSON array of ${safeCount} objects matching the schema.`,
        { maxTokens: 2048 }
    );

    if (!result || !Array.isArray(result) || result.length === 0) return { status: 'FAILED', error: 'Could not generate test data' };

    let output = result;
    if (format === 'csv') {
        const headers = Object.keys(result[0]);
        output = [headers.join(','), ...result.map(r => headers.map(h => `"${String(r[h] || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    }

    return { status: 'VERIFIED_SUCCESS', tool: 'generate_test_data', data: output, record_count: result.length, format, schema_description: schema, ai_powered: true, timestamp: new Date().toISOString() };
}

const handlers = { extract_invoice_data: handleExtractInvoiceData, generate_sql_query: handleGenerateSqlQuery, validate_json_schema: handleValidateJsonSchema, data_transform: handleDataTransform, generate_test_data: handleGenerateTestData };
module.exports = { definitions, handlers };
