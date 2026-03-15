// test-client.js
const http = require('http');

const PORT = process.env.PORT || 5001;
// Replace with actual firebase functions domain in production
const BASE_URL = `http://127.0.0.1:${PORT}/demo-no-project/us-central1/mcp`;

async function runTest() {
    console.log("🚀 Starting MCP Enterprise Agent Mock Test...");
    const sessionId = "test-session-" + Date.now();

    // We are going to mock an SSE connection directly via the native http module or fetch.
    // Using native fetch in Node 18+:
    console.log(`📡 Connecting to SSE endpoint: ${BASE_URL}/sse?sessionId=${sessionId}`);

    try {
        const sseResponse = await fetch(`${BASE_URL}/sse?sessionId=${sessionId}`, {
            headers: {
                // Here we mock a bearer token. Note: our app.js middleware attempts to verify it.
                // Wait, since admin.auth().verifyIdToken() will fail if not using real token, 
                // we might get 403 Forbidden. 
                "Authorization": "Bearer MOCK_TOKEN"
            }
        });

        if (!sseResponse.ok) {
            console.error("❌ Failed to connect to SSE endpoint.", sseResponse.status, sseResponse.statusText);
            // Fallback for displaying error body
            console.error(await sseResponse.text());
            return;
        }

        console.log("✅ SSE Connection established.");

        // Send the simulated JSON-RPC tool call request to the /messages endpoint
        console.log("📨 Sending tool execution trigger...");

        const toolCallPayload = {
            jsonrpc: "2.0",
            id: "req-12345",
            method: "tools/call",
            params: {
                name: "some-high-value-tool",
                arguments: {
                    inputData: "test"
                }
            }
        };

        const postResponse = await fetch(`${BASE_URL}/messages?sessionId=${sessionId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer MOCK_TOKEN"
            },
            body: JSON.stringify(toolCallPayload)
        });

        if (!postResponse.ok) {
            console.error("❌ Failed to send message.", postResponse.status, postResponse.statusText);
            return;
        }

        console.log("✅ Message sent successfully.");

        // In our backend, we don't handle the incoming tool call to return VERIFIED_SUCCESS. 
        // This script is to mock the flow. Let's send another request that simulates the 
        // SERVER responding. Wait, the test client cannot trigger the server to write the 
        // success unless the server has the tool implemented. Let's see if the server tracks it.

        console.log("Check the backend console for 'Moesif track event (high_value_state_change) triggered for ...'");

    } catch (error) {
        console.error("Test Client Error:", error);
    }
}

runTest();
