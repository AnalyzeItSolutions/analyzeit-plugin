# AnalyzeIt for Claude

Ask Claude about the data on your computer **without the data leaving it.**

```
curl -fsSL https://www.analyzeit.in/install.sh | sh
```

The installer puts the `analyzeit` command on your computer, verifies it, and registers it with Claude (Claude Code and Claude Desktop, when present). Then:

```
analyzeit data import sales.csv          # or: analyzeit connect ~/Reports
analyzeit data share sales on            # lets Claude see computed results of this dataset
```

Ask Claude "which regions sold most last quarter?" or use `/analyzeit:analyze top 5 regions by revenue`.

## How it works

This plugin is a thin layer: it starts `analyzeit mcp` (a tool server over stdio, part of the command line program). That program answers from your encrypted local vault and runs the analysis on your computer. It works with no network.

| Tool | What Claude gets |
|---|---|
| `list_datasets` | Names, row counts, column names and types of the datasets **you allowed** |
| `analyze` | A computed result of a built-in analysis: summary, top groups, trend, forecast, outlier counts, drivers |
| `privacy_policy` | What stays on your computer and what may leave it |

There is **no** tool that returns rows, runs SQL or reads files. That is enforced in the program (`core/src/egress.rs`), not by asking Claude to behave: private datasets return nothing; columns that are nearly unique per row (ids, names, emails) cannot be grouped by; groups of fewer than 3 records are left out; tables are capped at 50 rows and cells at 80 characters. Tests use planted canary values and a stub server to prove none reach the output.

What Claude is told is sent to Anthropic like anything you type into Claude. That is the computed result, not your data. `analyzeit policy` prints the rule.

## Manual install

```
claude plugin marketplace add AnalyzeItTech/analyzeit-connector
claude plugin install analyzeit@analyzeit
```
or without the plugin: `claude mcp add --scope user analyzeit -- analyzeit mcp`. Claude Desktop: add `"analyzeit": {"command": "analyzeit", "args": ["mcp"]}` under `mcpServers` in `claude_desktop_config.json`.

## Online projects (optional)

Data kept in your AnalyzeIt *account* can also be reached through the hosted connector for assistants that cannot run local programs: see [docs/hosted-connector.md](docs/hosted-connector.md).

## Develop

`node test/check.mjs` validates the manifests, checks that the server is the local command (no URL, no tokens) and scans the package for secrets.
