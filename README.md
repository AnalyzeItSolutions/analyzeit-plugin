# AnalyzeIt for any AI assistant

Your assistant takes the place of AnalyzeIt's own LLM. A sub-agent (`analyzeit-analyst`) does the planning, checking and answer-writing; AnalyzeIt's servers hold your data and compute exact aggregates. A small MCP server connects the two through the AnalyzeIt website's API.

```
Claude ──▶ analyzeit-analyst (sub-agent) ──▶ MCP tools ──▶ AnalyzeIt website API
              (replaces the hosted LLM)       (read-only)     (your projects, exact aggregates)
```

Everything you need to do happens on the website: you sign in and approve there, and upload files or connect sources there. No CLI or desktop app is needed.

## Works with

Claude (Code and Desktop), Cursor, VS Code, Windsurf, Zed, Cline, Codex CLI and Gemini CLI as an MCP server; OpenAI, xAI Grok, Gemini, Groq, Mistral, OpenRouter, Ollama and Anthropic through `analyzeit-agent` with your API key; and your own agent through exported tool definitions. Setup for each is in **[docs/clients.md](docs/clients.md)**. ChatGPT and Grok on the web need a hosted OAuth endpoint, which isn't part of this release (details there).

## Install (Claude Code)

```
claude plugin marketplace add AnalyzeItTech/claude-plugin
claude plugin install analyzeit@analyzeit
```

Requires Node 18+. Then ask Claude about your data, or run `/analyzeit:analyze top 5 regions by revenue`. The first time, the assistant calls `login`: your browser opens the AnalyzeIt website, you sign in and click **Allow**.

## Tools

| Tool | What it does |
|---|---|
| `login` / `whoami` / `logout` | Browser sign-in (loopback + PKCE, the flow the AnalyzeIt CLI and desktop app use); no password reaches the plugin |
| `list_projects`, `list_objects`, `list_datasets` | See what is in your account, with field names and types |
| `query_records` | Read rows, with filters, search and paging (max 200 per call) |
| `aggregate` | Count / sum / avg / min / max, grouped, computed on the server |
| `open_in_website` | Open the dashboard, a project, new project or connectors page, for steps you do on the site |

## Security and privacy

- **Read-only.** There is no tool that creates, changes or deletes data, and none that calls AnalyzeIt's hosted assistant.
- **Sign-in** happens on the website. The plugin gets a session token through a one-time code bound to a secret only this process holds (PKCE), delivered to `127.0.0.1` only.
- The token is stored in `~/.config/analyzeit-claude-plugin/session.json` (mode 0600). `logout` removes it. You can instead set `ANALYZEIT_TOKEN`.
- Data you read through the tools is sent to the model you are using in Claude, like any tool result. Use only with data you are comfortable sharing with it.
- The plugin talks only to the AnalyzeIt API and site. Override with `ANALYZEIT_API_URL` / `ANALYZEIT_SITE_URL` (https, or http for localhost).

## Develop

`cd analyzeit && npm test` runs the stdio server against a stand-in API and a fake browser (full sign-in exchange), the HTTP transport (including host/origin/token checks), both provider wire formats with fake model servers, and checks `tools/*.json` are in sync.
