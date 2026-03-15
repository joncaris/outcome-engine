"""
Outcome Engine × LangChain Integration
=======================================
Use 11 AI-powered MCP tools in your LangChain agent.
Only pay $0.10 per successful tool call.

pip install langchain langchain-mcp
"""

from langchain_mcp import MCPToolkit
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate

# 1. Connect to Outcome Engine
toolkit = MCPToolkit(
    server_url="https://mcp-firebase-server.mcpize.run/mcp"
)
tools = toolkit.get_tools()
print(f"Loaded {len(tools)} tools: {[t.name for t in tools]}")

# 2. Create your LLM
llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash")

# 3. Create the agent
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a sales research assistant. Use the available tools to research leads and companies."),
    ("human", "{input}"),
    ("placeholder", "{agent_scratchpad}"),
])

agent = create_tool_calling_agent(llm, tools, prompt)
executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

# 4. Run it
result = executor.invoke({
    "input": "Research the company stripe.com - verify the email ceo@stripe.com, enrich the lead, and summarize their homepage."
})

print("\n=== RESULT ===")
print(result["output"])
print("\nOnly successful tool calls were billed at $0.10 each.")
