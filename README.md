# AnalyzeIt for your AI assistant

Use ChatGPT, Claude, Grok, Cursor or any assistant that supports remote MCP servers on your [AnalyzeIt](https://www.analyzeit.in) data.

1. Add the connector to your assistant (one URL, below).
2. A browser window opens on the AnalyzeIt website. Sign in however you like (password, Google, GitHub) and click **Allow**.
3. You are sent back to your assistant, which is now connected. Nothing else to install.

```
https://backend-qwiq.onrender.com/mcp
```

Per-assistant steps are in **[docs/clients.md](docs/clients.md)**. This repository is the Claude Code plugin (the connector address, the analyst sub-agent and a skill); the connector itself runs on AnalyzeIt's servers, so there is no local program to trust or update.

## Install in Claude Code

```
claude plugin marketplace add AnalyzeItTech/claude-plugin
claude plugin install analyzeit@analyzeit
```

Then run `/mcp`, choose **analyzeit**, and **Authenticate**. Ask about your data, or use `/analyzeit:analyze top 5 regions by revenue`.

## What an assistant can do

Read only:

| Tool | |
|---|---|
| `list_projects`, `list_objects` | See your projects and tables, with field names and whether the assistant may read each |
| `get_ai_access` | See what you have allowed |
| `query_records`, `get_record` | Read rows (filters, search, paging; 100 per call) |
| `aggregate` | Exact count, sum, average, min, max, grouped, computed by AnalyzeIt |
| `list_connectors` | Which sources are connected and when they last synced (never credentials) |

Data from your connected sources (payments, spreadsheets, and so on) is read through the same tools. It cannot change, delete or send anything.

## You stay in control

- **Nothing is readable until you allow it.** AI data access is off for each project until you turn it on, and you can allow or block individual tables. The assistant is told to ask you; it cannot grant itself access.
- **Your password and session never reach the assistant.** You approve on the AnalyzeIt website. The assistant gets its own token that works only on this connector, expires after an hour, renews itself, and is cut off if a renewal token is ever replayed.
- **Disconnect any time** under Profile → Connected AI apps on the website. Changing your password or signing out everywhere disconnects every assistant.
- **Every read is logged** (tool, table, row count; never values) for 30 days.
- **Data you let it read goes to your assistant's provider**, like anything you type into it. Allow only what you are comfortable sharing.

## Report a problem

Security issues: please report privately to the AnalyzeIt team rather than in a public issue.

## Develop

`node test/check.mjs` validates the manifests and scans the package for anything that looks like a secret.
