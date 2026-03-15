# ⚡ Outcome Engine

### The MCP server that only charges when it works.

[![25 AI Tools](https://img.shields.io/badge/tools-25-blue)](https://mcpize.com/mcp/mcp-firebase-server)
[![Pay Per Success](https://img.shields.io/badge/billing-pay%20per%20success-green)](https://mcpize.com/mcp/mcp-firebase-server)
[![Gemini Powered](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-orange)](https://ai.google.dev)

**Zero risk. Zero upfront cost. Your agent only pays $0.10 when a tool call actually succeeds.**

Failed scrape? Free. Bad email? Free. API timeout? Free. You only pay for verified results.

---

## 🚀 Install in 30 Seconds

```bash
# Cursor
npx -y mcpize connect @jmcaris4/mcp-firebase-server --client cursor

# Claude Desktop
npx -y mcpize connect @jmcaris4/mcp-firebase-server --client claude

# Windsurf
npx -y mcpize connect @jmcaris4/mcp-firebase-server --client windsurf

# Cline
npx -y mcpize connect @jmcaris4/mcp-firebase-server --client cline
```

Or add manually to your MCP config:

```json
{
  "mcpServers": {
    "outcome-engine": {
      "url": "https://mcp-firebase-server.mcpize.run/mcp"
    }
  }
}
```

---

## 🎯 Why Outcome Engine?

Every other MCP tool server charges you per call — even when calls fail. Outcome Engine flips the model:

| Traditional MCP | Outcome Engine |
|---|---|
| Pay per call | **Pay per success** |
| Failed calls cost money | Failed calls are **free** |
| Flat monthly fees | **Usage-based, zero commitment** |
| Basic utilities | **AI-powered with Gemini 2.5 Flash** |

**For agent builders:** Your agents get smarter tools at zero risk.
**The math:** $0.10 per success x your agent's daily calls = predictable, success-only costs.

---

## 🛠️ 25 AI-Powered Tools

### 🌐 Web Scraping
| Tool | What It Does |
|---|---|
| `scrape_structured` | AI-powered data extraction from any URL |
| `extract_contact` | Find emails, phones, socials — even obfuscated ones |

### 📧 Email & Leads
| Tool | What It Does |
|---|---|
| `verify_email` | MX record validation + deliverability check |
| `enrich_lead` | AI sales intelligence brief (industry, pitch angle, tech stack) |

### 💻 Code Execution
| Tool | What It Does |
|---|---|
| `run_and_validate` | Sandboxed JS execution with test validation |
| `lint_and_fix` | AI code review — any language, semantic bugs, security |

### 📄 Document AI
| Tool | What It Does |
|---|---|
| `ocr_extract` | Text extraction from images |
| `classify_document` | AI document classification with entity extraction |
| `summarize_document` | AI summarization with configurable length |

### 🔗 API & Webhooks
| Tool | What It Does |
|---|---|
| `call_api_verified` | REST calls with response verification + SSRF protection |
| `webhook_delivery` | Payload delivery with receipt confirmation |

### 🤝 Sales Automation
| Tool | What It Does |
|---|---|
| `generate_outreach_email` | AI writes personalized sales emails from prospect data |
| `analyze_competitor` | SWOT analysis and positioning from competitor URL |

### 📊 Data Processing
| Tool | What It Does |
|---|---|
| `extract_invoice_data` | AI extracts line items, totals, vendor info from invoices |
| `generate_sql_query` | Natural language to SQL with schema-awareness |
| `validate_json_schema` | Validate JSON and auto-fix common issues |
| `data_transform` | Convert between CSV, JSON, nested, and flat formats |
| `generate_test_data` | AI generates realistic test data for any schema |

### ✍️ Content & Language
| Tool | What It Does |
|---|---|
| `translate_document` | AI translation (100+ languages, preserves formatting) |
| `rewrite_text` | Change tone, style, or reading level |
| `sentiment_analysis` | Emotion detection, urgency scoring, aspect-level sentiment |
| `generate_seo_content` | SEO-optimized blog posts, meta descriptions, social copy |

### 🛡️ Compliance
| Tool | What It Does |
|---|---|
| `detect_pii` | Find PII (SSN, credit cards, emails, phones) with confidence scores |

### 🔧 DevOps
| Tool | What It Does |
|---|---|
| `api_health_check` | Multi-endpoint health monitoring with latency tracking |
| `compare_documents` | AI-powered diff and semantic comparison |

---

## 💰 Pricing

| What Happens | Cost |
|---|---|
| Tool call succeeds (`VERIFIED_SUCCESS`) | **$0.10** |
| Tool call fails | **$0.00** |
| Tool call times out | **$0.00** |
| Tool call rate limited | **$0.00** |
| Discovery / listing tools | **$0.00** |

**You literally cannot lose money.** Free tier includes 5 calls/month.

| Plan | Rate | Limit |
|---|---|---|
| Free | $0.00 | 5 req/month |
| Pro | $0.10/success | 100 req/min |
| Enterprise | $0.08/success | 500 req/min |

---

## 🔌 Framework Integration

### LangChain (Python)

```python
from langchain_mcp import MCPToolkit

toolkit = MCPToolkit(server_url="https://mcp-firebase-server.mcpize.run/mcp")
tools = toolkit.get_tools()

# Use in your agent
from langchain.agents import create_tool_calling_agent
agent = create_tool_calling_agent(llm, tools, prompt)
```

### CrewAI

```python
from crewai import Agent, Task, Crew
from crewai_tools import MCPTool

lead_enricher = MCPTool(
    server_url="https://mcp-firebase-server.mcpize.run/mcp",
    tool_name="enrich_lead"
)

researcher = Agent(
    role="Sales Researcher",
    tools=[lead_enricher],
    goal="Research and qualify leads"
)
```

### Direct HTTP (any language)

```bash
curl -X POST https://mcp-firebase-server.mcpize.run/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "verify_email",
      "arguments": {"email": "ceo@stripe.com"}
    }
  }'
```

---

## 🔒 Built-In Protection

- **Rate Limiting** — Per-user sliding window (5-100 calls/min by tier)
- **Circuit Breaker** — Auto-throttles users with <20% success rate
- **SSRF Protection** — Private IPs blocked on API tools
- **Code Sandboxing** — `vm` module isolation, no filesystem/network access
- **Timeouts** — 5-15s hard limits per tool

---

## 📊 Example: Full Sales Research Pipeline

```
Agent: "Research Acme Corp for a sales call"

1. verify_email("ceo@acme.com")          -> Deliverable    -> $0.10
2. enrich_lead("acme.com")               -> AI brief       -> $0.10
3. scrape_structured(acme.com)            -> Pricing data   -> $0.10
4. analyze_competitor("acme.com")         -> SWOT analysis  -> $0.10
5. generate_outreach_email(prospect_data) -> Custom email   -> $0.10
6. sentiment_analysis(email_draft)        -> Tone check     -> $0.10

Total: $0.60 for a fully researched lead + drafted email
Failed calls along the way: $0.00
```

---

## 🏗️ Architecture

```
Agent (LangChain/CrewAI/Cursor/Claude)
    |
    v
MCPIZE Gateway (auth + billing)
    |
    v
Outcome Engine Server
    +-- Rate Limiter --> Block abuse
    +-- Circuit Breaker --> Throttle bad actors
    +-- Tool Registry --> 25 tools
    |   +-- Gemini 2.5 Flash (AI tools)
    |   +-- Deterministic Fallback
    +-- Result: VERIFIED_SUCCESS or FAILED
            |
            v
        Only VERIFIED_SUCCESS triggers billing
```

---

## 🔗 Links

- **Marketplace:** [mcpize.com/mcp/mcp-firebase-server](https://mcpize.com/mcp/mcp-firebase-server)
- **Landing Page:** [joncaris.github.io/outcome-engine](https://joncaris.github.io/outcome-engine/)
- **Gateway:** `https://mcp-firebase-server.mcpize.run/mcp`
- **GitHub:** [github.com/joncaris/outcome-engine](https://github.com/joncaris/outcome-engine)

---

**Built with 🔥 Firebase, ⚡ Gemini 2.5 Flash, and the conviction that you shouldn't pay for failure.**
