# Using AnalyzeIt from your assistant

Three ways in, depending on what your assistant supports. All of them use the same tools and the same analyst instructions, and sign you in on the AnalyzeIt website.

| You use | Way in |
|---|---|
| Claude Code, Claude Desktop, Cursor, VS Code (Copilot), Windsurf, Zed, Cline, Codex CLI, Gemini CLI, any MCP client that runs local servers | **A. MCP server (stdio)** |
| An MCP client that connects by URL on your own machine | **B. MCP over local HTTP** |
| OpenAI, xAI (Grok), Gemini, Groq, Mistral, OpenRouter, Ollama, LM Studio, Anthropic: through an API key | **C. `analyzeit-agent`** |
| Your own agent code | **D. Tool definitions** (`tools/*.json`) |

All paths below assume this repo is cloned at `~/analyzeit-claude-plugin`; use the real path. Node 18+ is required.

## A. MCP server (stdio)

The command is always `node /path/to/analyzeit/server/index.mjs`.

**Claude Code**: `claude plugin marketplace add AnalyzeItTech/claude-plugin && claude plugin install analyzeit@analyzeit` (adds the analyst sub-agent and `/analyzeit:analyze` too), or just the server: `claude mcp add analyzeit -- node ~/analyzeit-claude-plugin/analyzeit/server/index.mjs`

**Claude Desktop** (`claude_desktop_config.json`), **Cursor** (`~/.cursor/mcp.json`), **Windsurf**, **Cline**:
```json
{ "mcpServers": { "analyzeit": { "command": "node", "args": ["/path/to/analyzeit/server/index.mjs"] } } }
```

**VS Code** (`.vscode/mcp.json`):
```json
{ "servers": { "analyzeit": { "type": "stdio", "command": "node", "args": ["/path/to/analyzeit/server/index.mjs"] } } }
```

**Codex CLI** (`~/.codex/config.toml`):
```toml
[mcp_servers.analyzeit]
command = "node"
args = ["/path/to/analyzeit/server/index.mjs"]
```

**Gemini CLI** (`~/.gemini/settings.json`): same shape as the Claude Desktop block.

**Zed** (`settings.json`): `"context_servers": { "analyzeit": { "command": { "path": "node", "args": ["/path/to/analyzeit/server/index.mjs"] } } }`

First use: ask the assistant about your data. It calls `login`, your browser opens the AnalyzeIt website, you sign in and click **Allow**.

## B. MCP over local HTTP

```bash
ANALYZEIT_MCP_TOKEN=pick-a-long-random-string node analyzeit/server/index.mjs --http --port 8765
```
Point the client at `http://127.0.0.1:8765/mcp` with header `Authorization: Bearer <that token>`. It listens on loopback only and rejects other `Host` and `Origin` headers. **Do not expose this port to the internet or through a tunnel**: anyone who can reach it can read your AnalyzeIt data as you.

## C. `analyzeit-agent` (any provider with an API key)

Runs the analyst loop itself, using the model you choose, and prints the answer. You pick the model (names change, so none is assumed).

```bash
export OPENAI_API_KEY=...        # or XAI_API_KEY, GEMINI_API_KEY, GROQ_API_KEY, MISTRAL_API_KEY, OPENROUTER_API_KEY, ANTHROPIC_API_KEY
node analyzeit/server/agent.mjs --provider openai    --model <model> "monthly revenue trend"
node analyzeit/server/agent.mjs --provider xai       --model <model> "top 5 customers by revenue"     # Grok
node analyzeit/server/agent.mjs --provider gemini    --model <model> "which region grew fastest?"
node analyzeit/server/agent.mjs --provider anthropic --model <model> "any outliers in order value?"
node analyzeit/server/agent.mjs --provider ollama    --model <local-model> "count orders by status"   # fully local model
node analyzeit/server/agent.mjs --provider custom --base-url https://my-gateway.example/v1 --model <model> "..."
```
Any OpenAI-compatible endpoint works with `custom`. `-v` prints tool calls to stderr. Rows the tools read are sent to the provider you pick; with `ollama` they stay on your machine.

## D. Your own agent

`tools/openai.json`, `tools/anthropic.json`, `tools/gemini.json` and `tools/mcp.json` hold the tool definitions in each vendor's function-calling format. Execute calls with `callTool(cfg, name, args)` from `server/tools.mjs`, and use `agents/analyzeit-analyst.md` as the system prompt. Regenerate with `npm run export-tools` after changing tools.

## ChatGPT and Grok on the web (chatgpt.com, grok.com)

Their built-in connector features only talk to a **publicly hosted** MCP server that supports OAuth. This plugin runs on your machine, so it cannot be added there, and tunnelling it would expose your data (see the warning in B). That needs a hosted AnalyzeIt MCP endpoint with an OAuth consent screen on the website, which is not part of this release. Until then, use **C** with your OpenAI or xAI key, or the API/desktop versions of those assistants if they support local MCP servers.
