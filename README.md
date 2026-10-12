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
claude plugin marketplace add AnalyzeItTech/analyzeit-connector
claude plugin install analyzeit@analyzeit
```

Then run `/mcp`, choose **analyzeit**, and **Authenticate**. Ask about your data, or use `/analyzeit:analyze top 5 regions by revenue`.

## What an assistant can do

| Tool | |
|---|---|
| `list_projects`, `list_objects`, `get_ai_access` | See your projects, tables (fields, whether it may read each) and what you have allowed |
| `query_records`, `get_record`, `aggregate` | Read rows, or get exact count, sum, average, min, max, grouped, computed by AnalyzeIt |
| `request_access` | Ask to read specific tables. You get a **snapshot** (tables, fields, record counts, a few example rows shown only to you) and a link |
| `propose_change` | Suggest updating or deleting records. You get the exact **before/after snapshot** and a link; nothing changes until you approve; undo for 30 days |
| `list_available_connectors`, `connect_source` | Start connecting any source AnalyzeIt supports: you get a link and finish on the AnalyzeIt website. No password or key ever goes through the chat |
| `list_connectors`, `get_request_status`, `reject_request` | See connected sources, check whether you approved something, or cancel it |
| `approve_request`, `undo_change` | **Only if you ticked chat approval when connecting.** Carry out what you approve by saying so in the chat |

Data from your connected sources is read through the same tools.

## You stay in control

- **Nothing is readable until you allow it.** AI data access is off for each project until you allow it, per table or for the whole project. The assistant can only ask; it cannot grant itself access.
- **You see before anything happens.** Access requests, changes and new connections each come as a snapshot plus a link. You approve on the AnalyzeIt website, or, if you chose to, by telling the assistant “yes, approve it”.
- **Chat approval is opt-in and limited.** It is a tick-box on the sign-in page, off unless you tick it. It only covers what that same connection proposed, after a short pause, changes of up to 100 records and specific tables (never a whole project). Your words are logged with the approval. Everything bigger needs the website. Data can contain text written by other people, so leave it off if you do not need it.
- **Your password and session never reach the assistant.** You approve on the AnalyzeIt website. The assistant gets its own token that works only on this connector, expires after an hour, renews itself, and is cut off if a renewal token is ever replayed.
- **Disconnect any time** under Profile → Connected AI apps. Changing your password or signing out everywhere disconnects every assistant.
- **Every call is logged** (tool, table, row count, and your words for chat approvals; never data values) for 30 days.
- **Data you let it read goes to your assistant's provider**, like anything you type into it. Allow only what you are comfortable sharing.

## Report a problem

Security issues: see [SECURITY.md](SECURITY.md); please report privately, not in a public issue.

## Develop

`node test/check.mjs` validates the manifests and scans the package for anything that looks like a secret.
