"""
Outcome Engine × CrewAI Integration
=====================================
Build a multi-agent sales research crew with pay-per-success tools.
Only $0.10 per verified result — failed calls are free.

pip install crewai crewai-tools
"""

from crewai import Agent, Task, Crew, Process
from crewai_tools import MCPTool

# 1. Connect tools from Outcome Engine
SERVER = "https://mcp-firebase-server.mcpize.run/mcp"

email_verifier = MCPTool(server_url=SERVER, tool_name="verify_email")
lead_enricher = MCPTool(server_url=SERVER, tool_name="enrich_lead")
web_scraper = MCPTool(server_url=SERVER, tool_name="scrape_structured")
doc_summarizer = MCPTool(server_url=SERVER, tool_name="summarize_document")

# 2. Define agents
researcher = Agent(
    role="Lead Researcher",
    goal="Research companies and verify contact information",
    backstory="Expert sales researcher who qualifies leads before outreach",
    tools=[email_verifier, lead_enricher, web_scraper],
    verbose=True
)

writer = Agent(
    role="Sales Brief Writer",
    goal="Create compelling sales briefs from research data",
    backstory="Expert at turning raw research into actionable sales intelligence",
    tools=[doc_summarizer],
    verbose=True
)

# 3. Define tasks
research_task = Task(
    description="Research {company_domain}. Verify the email {contact_email}, enrich the company lead, and scrape their pricing page.",
    expected_output="Structured research report with verified email, company brief, and pricing data",
    agent=researcher
)

brief_task = Task(
    description="Using the research data, create a 1-page sales brief for the sales team.",
    expected_output="A concise sales brief with company overview, key contacts, and recommended approach",
    agent=writer
)

# 4. Run the crew
crew = Crew(
    agents=[researcher, writer],
    tasks=[research_task, brief_task],
    process=Process.sequential,
    verbose=True
)

result = crew.kickoff(inputs={
    "company_domain": "stripe.com",
    "contact_email": "sales@stripe.com"
})

print("\n=== SALES BRIEF ===")
print(result)
print("\nCost: Only successful tool calls billed at $0.10 each")
