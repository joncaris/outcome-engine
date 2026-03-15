# Metered Billing Integration Roadmap

This document outlines the full **Outcome-Based Metering** strategy for monetizing the MCP Server across both MCPIZE and self-hosted Stripe pipelines.

---

## 1. MCPIZE Pricing Configuration

### Recommended Tiers (configure in MCPIZE Dashboard → Server Settings → Pricing)

| Tier | Price | Included | Notes |
|---|---|---|---|
| **Free** | $0/mo | 5 tool calls/month | Discovery & adoption. Zero friction. |
| **Pro** | $0.10/outcome | Unlimited | Per `VERIFIED_SUCCESS` event. Core revenue driver. |
| **Enterprise** | Custom | Volume discounts | 1K+/mo: 20% off. 10K+: migrate to direct Stripe. |

### Dashboard Steps
1. Log into [mcpize.com](https://mcpize.com) → navigate to **mcp-firebase-server**
2. Go to **Settings** → **Pricing / Monetization**
3. **Add Free Tier**: Set 5 free calls/month, no credit card required
4. **Add Pro Tier**: Set usage-based pricing at **$0.10 per successful outcome**
5. **Enable metered billing** so charges map to actual tool invocations
6. Save and publish pricing

---

## 2. Moesif → Stripe Integration (Self-Hosted Pipeline)

For enterprise clients bypassing MCPIZE (you keep ~97% revenue):

### Stripe Setup
1. Create a Product in Stripe Dashboard (e.g., "Agentic Auto Tool Invocation")
2. Add a **Usage-based Price** → $0.10/unit, monthly billing
3. Record the **Price ID** (e.g., `price_1PXXX...`)

### Moesif Setup
1. Connect Stripe via **Settings → Billing Integrations**
2. Create a **Billing Meter** named "Agentic Tool Usage"
3. Set provider to **Stripe**, paste the Price ID
4. Filter: **Action Name** = `high_value_state_change`

### Verification
- `evaluateOutcome()` fires `high_value_state_change` with `userId` = Stripe Customer ID
- Moesif Billing Meter increments usage → Stripe generates invoice automatically

---

## 3. Revenue Projections

| Monthly Outcomes | Per-Outcome | Gross | MCPIZE (85%) | Self-Hosted (97%) |
|---|---|---|---|---|
| 100 | $0.10 | $10 | $8.50 | $9.70 |
| 1,000 | $0.10 | $100 | $85 | $97 |
| 10,000 | $0.10 | $1,000 | $850 | $970 |
| 50,000 | $0.08 | $4,000 | $3,400 | $3,884 |

---

## 4. Checklist

- [x] Event Generation: MCP server confirms `"status": "VERIFIED_SUCCESS"`
- [x] Event Delivery: Middleware transmits `high_value_state_change` with `stripeCustomerId`
- [x] MCPIZE Deployment: Server deployed with `/mcp`, `/health`, `/ping` endpoints
- [x] MCPIZE Secrets: `MOESIF_APPLICATION_ID`, `STRIPE_SECRET_KEY`, `MOCK_TOKEN` imported
- [ ] **MCPIZE Pricing**: Configure Free + Pro tiers in dashboard
- [ ] Moesif Integration: Link Moesif Dashboard to Stripe via OAuth
- [ ] Stripe Price Mapping: Map `high_value_state_change` → Stripe Price ID
- [ ] End-to-End Verification: Test outcome → Moesif → Stripe invoice pipeline

## 5. Future Improvements
- Rate limiting / deduplication window in outcome tracker middleware
- Dynamic pricing per tool type (different outcomes = different price points)
- Enterprise upsell automation: detect high-volume MCPIZE users → offer direct contracts
