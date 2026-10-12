# Connecting your assistant

You need an assistant that supports **remote MCP servers with sign-in (OAuth)**. The address is always:

```
https://backend-qwiq.onrender.com/mcp
```

The first time, your browser opens the AnalyzeIt website. Sign in, check the app name and the address it will send you back to, and click **Allow**. If you did not just start the connection yourself, click Cancel.

Menu names change between app versions; if yours differs, look for "connectors", "custom connector", "MCP servers" or "tools".

## Claude

- **Claude Code (plugin, recommended):** `claude plugin marketplace add AnalyzeItTech/claude-plugin`, `claude plugin install analyzeit@analyzeit`, then `/mcp` → analyzeit → Authenticate.
- **Claude Code (server only):** `claude mcp add --transport http analyzeit https://backend-qwiq.onrender.com/mcp`, then `/mcp` → Authenticate.
- **Claude on the web / desktop:** Settings → Connectors → add a custom connector → paste the address.

## ChatGPT

Settings → Connectors → add a custom connector (MCP server) → paste the address → choose OAuth. Custom connectors may require Developer mode or a plan that includes them.

## Grok and other assistants

Wherever the app asks for a remote MCP server URL (Grok, Cursor, VS Code, Windsurf, Zed, Cline, Codex, Gemini CLI, and others), paste the address and choose sign-in / OAuth if asked. Clients that only run local programs cannot use a hosted connector.

## What it can see

Only what you allow. In each project's settings, turn on AI data access for the whole project or for individual tables. See `README.md` for the full list of what the assistant can and cannot do, and the website's *Connect an AI assistant* docs page for the security details.

## Disconnecting

Profile → Connected AI apps → Disconnect. Or disconnect inside your assistant. Changing your password disconnects every assistant.
