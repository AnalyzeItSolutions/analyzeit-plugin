> **This is the optional online connector** for ChatGPT, Grok and other assistants that cannot run local programs. It reads data stored in your AnalyzeIt *account*. It is not what the Claude plugin uses: the plugin runs the `analyzeit` command on your computer and sees computed results only (see the README).

# Connecting your assistant

You need an assistant that supports **remote MCP servers with sign-in (OAuth)**. The address is always:

```
https://api.analyzeit.si/mcp
```

The first time, your browser opens the AnalyzeIt website. Sign in, check the app name and the address it will send you back to, and click **Allow**. If you did not just start the connection yourself, click Cancel.

Menu names change between app versions; if yours differs, look for "connectors", "custom connector", "MCP servers" or "tools".

## Claude

- **Claude Code (plugin, recommended):** `claude plugin marketplace add AnalyzeItTech/analyzeit-plugin`, `claude plugin install analyzeit@analyzeit`, then `/mcp` → analyzeit → Authenticate.
- **Claude Code (server only):** `claude mcp add --transport http analyzeit https://api.analyzeit.si/mcp`, then `/mcp` → Authenticate.
- **Claude on the web / desktop:** Settings → Connectors → add a custom connector → paste the address.

## ChatGPT

Settings → Connectors → add a custom connector (MCP server) → paste the address → choose OAuth. Custom connectors may require Developer mode or a plan that includes them.

## Grok and other assistants

Wherever the app asks for a remote MCP server URL (Grok, Cursor, VS Code, Windsurf, Zed, Cline, Codex, Gemini CLI, and others), paste the address and choose sign-in / OAuth if asked. Clients that only run local programs cannot use a hosted connector.

## What it can do

Read what you allow, and *ask*: for access to a table, for a change to your data, or to connect a source. Each ask comes with a snapshot and a link; you approve on the AnalyzeIt website. On the sign-in page there is an optional, unticked box that lets you approve from the chat instead by saying so (small changes and specific tables only). See `README.md` for the full list and the safeguards.

## Disconnecting

Profile → Connected AI apps → Disconnect. Or disconnect inside your assistant. Changing your password disconnects every assistant.
