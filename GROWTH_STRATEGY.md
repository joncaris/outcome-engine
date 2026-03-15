# Outcome Engine — 30-Day Growth Strategy & Content Calendar

## Growth Channels (Ranked by ROI)

### 1. MCPIZE Marketplace (HIGHEST ROI — Already Done ✅)
Agents actively searching for tools. Zero effort after setup.
- SEO title/description optimized ✅
- Tags maxed (10/10) ✅
- 25 tools = massive keyword surface area ✅

### 2. GitHub Discoverability
Your repo is at github.com/joncaris/outcome-engine
- README already has install commands for Cursor/Claude/LangChain/CrewAI ✅
- **Next:** Star your own repo, add topics (ai, mcp, tools, agents)

### 3. Reddit (r/LocalLLaMA, r/ChatGPT, r/artificial, r/SideProject)
AI developer communities. High-intent audience. No followers needed — posts succeed on merit.

### 4. Hacker News (Show HN)
One post can drive thousands of developers. Meritocratic — doesn't matter if you have 0 followers.

### 5. Dev.to / Hashnode
Long-form technical content. Gets indexed by Google. Evergreen lead gen.

### 6. Twitter/X
Long-term play. Builds personal brand over time.

---

## 30-Day Content Calendar

> **Time commitment:** ~10 min/day. All copy is pre-written below. Just paste and post.

### WEEK 1: Launch Week (Days 1-7)

**Day 1 (Monday) — Reddit Launch**
**Where:** r/SideProject
**Title:** "I built an MCP server that only charges AI agents when tools actually succeed"
**Body:**
```
I got frustrated paying for AI tool calls that failed or returned garbage, so I built Outcome Engine — an MCP server with 25 AI-powered tools where you only pay on verified success.

How it works:
- Connect in 30 seconds: npx -y mcpize connect @jmcaris4/mcp-firebase-server --client cursor
- 25 tools: web scraping, code execution, document AI, sales automation, PII detection, SEO content, SQL generation
- Free tier: 5 calls/month
- Pro: $0.10 per successful call (failed calls = $0)

Tech stack: Node.js + Gemini 2.5 Flash on MCPIZE

Would love feedback from other builders. What tools would you want added?

Link: https://mcpize.com/mcp/mcp-firebase-server
```

**Day 2 (Tuesday) — Hacker News**
**Where:** news.ycombinator.com (Show HN)
**Title:** "Show HN: Outcome Engine – Pay-per-success AI tools for agents (MCP)"
**Body:**
```
25 AI-powered tools (scraping, code execution, doc AI, compliance, sales) via MCP protocol. You only pay when tools return VERIFIED_SUCCESS. Failed calls, timeouts, bad inputs = free.

Built with Node.js + Gemini 2.5 Flash. Margin is ~300x because Gemini is cheap and we only charge on success.

Free to try: npx -y mcpize connect @jmcaris4/mcp-firebase-server --client cursor

https://mcpize.com/mcp/mcp-firebase-server
```

**Day 3 (Wednesday) — Reddit r/LocalLLaMA**
**Title:** "25 MCP tools with outcome-based billing — only pay when they work"
**Body:**
```
Built an MCP server with 25 tools spanning: web scraping, structured extraction, code sandbox, document classification, PII detection, sentiment analysis, SQL generation, SEO content, and more.

The billing model is outcome-based: VERIFIED_SUCCESS = you pay $0.10. Everything else (errors, timeouts, bad input) = free.

Works with Cursor, Claude, Windsurf, Cline, LangChain, CrewAI.

One-liner to try: npx -y mcpize connect @jmcaris4/mcp-firebase-server --client cursor

Curious what the community thinks about outcome-based pricing for AI tools.
```

**Day 4 (Thursday) — Dev.to Article**
**Title:** "Why I Stopped Charging Per API Call and Started Charging Per Success"
**Publish on:** dev.to (create free account)
```markdown
# Why I Stopped Charging Per API Call and Started Charging Per Success

Every AI tool API charges you per request. Bad response? You pay. Timeout? You pay. Hallucinated garbage? You pay.

I think that's broken.

## The Problem
AI agents make lots of tool calls. Many fail. Web scraping hits CAPTCHAs. Code execution throws errors. API calls timeout. The agent retries, and you pay again.

## The Fix: Outcome-Based Billing
I built Outcome Engine — 25 AI tools where billing is tied to the verified outcome:
- `VERIFIED_SUCCESS` → you pay $0.10
- `FAILED`, `ERROR`, `TIMEOUT` → free

## How It Works
Every tool call goes through:
1. **Input validation** — bad inputs are rejected (free)
2. **Execution** — the tool runs
3. **Output verification** — we verify the result is useful
4. **Billing event** — only fires on step 3 success

## The Tools (25 and growing)
- **Web:** scrape_structured, extract_contact
- **Code:** run_and_validate, lint_and_fix
- **Docs:** ocr_extract, classify_document, summarize_document
- **Sales:** generate_outreach_email, analyze_competitor
- **Data:** extract_invoice_data, generate_sql_query, generate_test_data
- **Content:** translate_document, rewrite_text, sentiment_analysis, generate_seo_content
- **Compliance:** detect_pii
- **DevOps:** api_health_check, compare_documents

## Try It (30 seconds)
\`\`\`bash
npx -y mcpize connect @jmcaris4/mcp-firebase-server --client cursor
\`\`\`

GitHub: https://github.com/joncaris/outcome-engine
Marketplace: https://mcpize.com/mcp/mcp-firebase-server
```

**Day 5 (Friday) — Twitter Thread**
Use the 7-tweet thread from LAUNCH.md (already written)

**Day 6 (Saturday) — Reddit r/artificial**
**Title:** "Outcome-based billing for AI tools — does this model make sense?"
**Body:**
```
I built an MCP server where agents only pay for successful tool calls.

25 tools covering scraping, code execution, document AI, compliance (PII detection), sales automation, content generation.

The economics: my cost is $0.0003/call (Gemini 2.5 Flash), charge is $0.10/success. Failed calls cost the user nothing.

Curious if you think outcome-based pricing will become standard for AI tool APIs. The alternative (pay-per-request) punishes agents for retrying.
```

**Day 7 (Sunday) — GitHub Topics + Stars**
Open github.com/joncaris/outcome-engine → Settings → add topics:
`mcp`, `ai-tools`, `outcome-based-billing`, `agents`, `gemini`, `web-scraping`, `code-execution`, `cursor`, `claude`

---

### WEEK 2: Technical Deep Dives (Days 8-14)

**Day 8** — Dev.to: "How I Built a 300x Margin AI Business with Gemini 2.5 Flash"
**Day 9** — Reddit r/ChatGPT: Show the Cursor integration (screenshot of tool working)
**Day 10** — Twitter: "The economics of AI tools" infographic thread
**Day 11** — Dev.to: "Detect PII in Text with One API Call — No Training Required"
**Day 12** — Reddit r/SideProject: Week 1 metrics update + lessons learned
**Day 13** — Hashnode: Cross-post the best performing Dev.to article
**Day 14** — Twitter: Reply to 5 AI tool threads with helpful answers mentioning Outcome Engine

---

### WEEK 3: Use Case Spotlights (Days 15-21)

**Day 15** — Dev.to: "5 Ways AI Agents Use Outcome Engine to Save Money"
**Day 16** — Reddit r/Cursor: "Free MCP tools for Cursor — 25 AI tools, pay only on success"
**Day 17** — Twitter: Demo video/GIF of a tool working in Cursor
**Day 18** — Dev.to: "From Natural Language to SQL in 2 Seconds"
**Day 19** — Reddit r/learnprogramming: "Built a free code review tool that catches security bugs"
**Day 20** — Product Hunt: Submit (best day: Tuesday/Wednesday)
**Day 21** — Twitter: Share Product Hunt launch + ask for upvotes

---

### WEEK 4: Community Building (Days 22-30)

**Day 22** — Reply to every comment/question from Week 1-3 posts
**Day 23** — Dev.to: "Building MCP Servers for Fun and Profit"
**Day 24** — Reddit r/entrepreneur: "How I built a $0/month cost business that charges per success"
**Day 25** — Twitter: Customer testimonial or usage milestone
**Day 26** — Dev.to: "The Complete Guide to Outcome-Based AI Billing"
**Day 27** — Reply to AI tool comparison threads on Reddit
**Day 28** — Twitter: "25 tools. 300x margins. $0 marketing budget" thread
**Day 29** — Newsletter: Create a Substack post summarizing Month 1
**Day 30** — Evaluate metrics, plan Month 2

---

## Projected Growth

| Channel | Month 1 Est. Users | Conversion to Paid | Monthly Revenue |
|---|---|---|---|
| MCPIZE Organic | 50-200 | 5-10% | $50-200 |
| Reddit Posts | 100-500 | 3-5% | $30-250 |
| Hacker News | 200-2,000 | 2-3% | $40-600 |
| Dev.to Articles | 50-300 | 5-8% | $25-240 |
| GitHub Stars | 20-100 | 10% | $20-100 |
| **Total Month 1** | **420-3,100** | | **$165-$1,390** |
| **Month 3 (compound)** | | | **$500-$4,000** |
| **Month 6 (compound)** | | | **$2,000-$16,000** |

## The Key Insight
You don't need followers. Reddit, HN, and Dev.to are **meritocratic** — posts succeed based on value, not follower count. A single good HN post can bring more traffic than 10K Twitter followers.
