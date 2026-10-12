# AnalyzeIt plugin for Claude

Claude takes the place of AnalyzeIt's own LLM. A sub-agent (`analyzeit-analyst`) does the planning, checking and answer-writing; AnalyzeIt's servers hold your data and compute exact aggregates. A small MCP server connects the two through the AnalyzeIt website's API.

```
Claude ──▶ analyzeit-analyst (sub-agent) ──▶ MCP tools ──▶ AnalyzeIt website API
              (replaces the hosted LLM)       (read-only)     (your projects, exact aggregates)
```

Everything you need to do happens on the website: you sign in and approve there, and upload files or connect sources there. No CLI or desktop app is needed.

## Install

```
claude plugin marketplace add AnalyzeItTech/claude-plugin
claude plugin install analyzeit@analyzeit
```

Requires Node 18+. Then ask Claude about your data, or run `/analyzeit:analyze top 5 regions by revenue`. The first time, Claude calls `login`: your browser opens the AnalyzeIt website, you sign in and click **Allow**.

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

`node analyzeit/test/smoke.mjs` runs the server against a local stand-in for the API and a fake browser, including the full sign-in exchange.
