# AnalyzeIt for Claude

Ask Claude about the data on your computer **without the data leaving it.**

```
curl -fsSL https://www.analyzeit.si/install.sh | sh
```

The installer puts the `analyzeit` command (0.5.1 or newer) on your computer, verifies it, and registers it with Claude (Claude Code and Claude Desktop, when present). Then:

```
analyzeit data import sales.csv          # or: analyzeit connect ~/Reports
analyzeit data share sales on            # lets Claude see computed results of this dataset
```

Ask Claude "which regions sold most last quarter?" or use `/analyzeit:analyze top 5 regions by revenue`, `/analyzeit:overview sales` (a short briefing) or `/analyzeit:status` (is it set up?).

## How it works

This plugin is a thin layer: a small launcher script (`analyzeit/scripts/analyzeit-mcp.sh`, which checks the command is installed and new enough) starts `analyzeit mcp` (a tool server over stdio, part of the command line program). That program answers from your encrypted local vault and runs the analysis on your computer. It works with no network.

| Tool | What Claude gets |
|---|---|
| `list_datasets` | Names, row counts, column names and types of the datasets **you allowed** |
| `analyze` | A computed result of a built-in analysis, asked in plain words |
| `summary`, `top_groups`, `trend`, `forecast`, `find_outliers`, `drivers`, `compare_groups` | The same results-only analyses with named inputs (dataset, column, measure), so Claude does not have to phrase a question. Names are checked: letters, digits, spaces, `_ . -` only |
| `browser_open`, `browser_snapshot`, `browser_act` | Claude works in **your own signed-in browser on any website**: open a page, read it, click, type, press keys, scroll. Goes straight to the AnalyzeIt extension on your computer (no website). Sign-in is always yours; Post/Send/Buy/Delete-style clicks show an Allow/Deny box on the page. Needs CLI 0.6.1+ and `analyzeit extension connect` |
| `propose_browser_task`, `browser_task_status` | Claude plans steps for **your own signed-in browser** (read your X or LinkedIn profile, put a post you gave it in the box). You approve them on AnalyzeIt, then in the browser extension's own window; if you are signed out it waits while you sign in. Needs `analyzeit login`, CLI 0.6.1+ |
| `draft_post` | Saves a post in your Drafts in your voice. Nothing is posted |
| `privacy_policy` | What stays on your computer and what may leave it |

There is **no** tool that returns rows, runs SQL or reads files. That is enforced in the program (`core/src/egress.rs`), not by asking Claude to behave: private datasets return nothing; columns that are nearly unique per row (ids, names, emails) cannot be grouped by; groups of fewer than 3 records are left out; tables are capped at 50 rows and cells at 80 characters. Tests use planted canary values and a stub server to prove none reach the output.

What Claude is told is sent to Anthropic like anything you type into Claude. That is the computed result, not your data. `analyzeit policy` prints the rule.

## Manual install

```
claude plugin marketplace add AnalyzeItTech/analyzeit-plugin
claude plugin install analyzeit@analyzeit
```
or without the plugin: `claude mcp add --scope user analyzeit -- analyzeit mcp`. Claude Desktop: add `"analyzeit": {"command": "analyzeit", "args": ["mcp"]}` under `mcpServers` in `claude_desktop_config.json`.

## Online projects (optional)

Data kept in your AnalyzeIt *account* can also be reached through the hosted connector for assistants that cannot run local programs: see [docs/hosted-connector.md](docs/hosted-connector.md).

## Develop

`node test/check.mjs` validates the manifests, the directory-listing requirements (README, license, icon, no stray files), the launcher (including its version gate) and scans the package for secrets. `claude plugin validate . --strict` and `claude plugin validate ./analyzeit --strict` must also pass.
