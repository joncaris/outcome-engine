# ⚡ Outcome Engine

### The MCP server that only charges when it works.

[![11 AI Tools](https://img.shields.io/badge/tools-11-blue)](https://mcpize.com/mcp/mcp-firebase-server)
[![Pay Per Success](https://img.shields.io/badge/billing-pay%20per%20success-green)](https://mcpize.com/mcp/mcp-firebase-server)
[![Gemini Powered](https://img.shields.io/badge/AI-Gemini%202.0-orange)](https://ai.google.dev)

**Zero risk. Zero upfront cost. Your agent only pays $0.10 when a tool call actually succeeds.**

Failed scrape? Free. Bad email? Free. API timeout? Free. You only pay for verified results.

---

## 🎯 Why Outcome Engine?

Every other MCP tool server charges you per call — even when calls fail. Outcome Engine flips the model:

| Traditional MCP | Outcome Engine |
|---|---|
| Pay per call | **Pay per success** |
| Failed calls cost money | Failed calls are **free** |
| Flat monthly fees | **Usage-based, zero commitment** |
| Basic utilities | **AI-powered with Gemini 2.0** |

**For agent builders:** Your agents get smarter tools at zero risk.  
**The math:** $0.10 per success × your agent's daily calls = predictable, success-only costs.

---

## 🛠️ 11 AI-Powered Tools

| Category | Tool | What It Does |
|---|---|---|
| 🌐 **Web Scraping** | `scrape_structured` | AI-powered data extraction from any URL |
| | `extract_contact` | Find emails, phones, socials — even obfuscated ones |
| 📧 **Email & Leads** | `verify_email` | MX record validation + deliverability check |
| | `enrich_lead` | AI sales intelligence brief (industry, pitch angle, tech stack) |
| 💻 **Code** | `run_and_validate` | Sandboxed JS execution with test validation |
| | `lint_and_fix` | AI code review — any language, semantic bugs, security |
| 📄 **Documents** | `classify_document` | AI document classification with entity extraction |
| | `summarize_document` | AI summarization with configurable length |
| | `ocr_extract` | Text extraction from images |
| 🔗 **API** | `call_api_verified` | REST calls with response verification + SSRF protection |
| | `webhook_delivery` | Payload delivery with receipt confirmation |

---

## ⚡ Quick Start

### Cursor / Claude Desktop

Add to your MCP config (`~/.cursor/mcp.json` or `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "outcome-engine": {
      "url": "https://mcp-firebase-server.mcpize.run/mcp"
    }
  }
}
```

That's it. Your agent now has 11 AI tools that only cost when they work.

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

## 💰 Pricing

| What Happens | Cost |
|---|---|
| Tool call succeeds (`VERIFIED_SUCCESS`) | **$0.10** |
| Tool call fails | **$0.00** |
| Tool call times out | **$0.00** |
| Tool call rate limited | **$0.00** |
| Discovery / listing tools | **$0.00** |

**You literally cannot lose money.**

---

## 🔒 Built-In Protection

- **Rate Limiting** — Per-user sliding window (5-100 calls/min by tier)
- **Circuit Breaker** — Auto-throttles users with <20% success rate
- **SSRF Protection** — Private IPs blocked on API tools
- **Code Sandboxing** — `vm` module isolation, no filesystem/network access
- **Timeouts** — 5-15s hard limits per tool

---

## 📊 Example: Sales Lead Agent

```
Agent: "Research Acme Corp for a sales call"

1. verify_email("ceo@acme.com")     → ✅ Valid, MX verified     → $0.10
2. enrich_lead("acme.com")          → ✅ AI brief generated     → $0.10
3. scrape_structured(acme.com)      → ✅ Pricing extracted      → $0.10
4. summarize_document(about page)   → ✅ Company summary        → $0.10

Total: $0.40 for a fully researched lead
Failed calls along the way: $0.00
```

---

## 🏗️ Architecture

```
Agent (LangChain/CrewAI/Cursor)
    │
    ▼
MCPIZE Gateway (auth + billing)
    │
    ▼
Outcome Engine Server
    ├── Rate Limiter ──→ Block abuse
    ├── Circuit Breaker ──→ Throttle bad actors
    ├── Tool Registry ──→ 11 tools
    │   ├── Gemini AI Layer (when applicable)
    │   └── Deterministic Fallback
    └── Result: VERIFIED_SUCCESS or FAILED
            │
            ▼
        Only VERIFIED_SUCCESS triggers billing
```

---

## 🔗 Links

- **Marketplace:** [mcpize.com/mcp/mcp-firebase-server](https://mcpize.com/mcp/mcp-firebase-server)
- **Gateway:** `https://mcp-firebase-server.mcpize.run/mcp`

---

**Built with 🔥 Firebase, ⚡ Gemini 2.0, and the conviction that you shouldn't pay for failure.**
