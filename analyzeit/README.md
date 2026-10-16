# AnalyzeIt for Claude

Ask Claude about the data on your computer **without the data leaving it.** Claude asks the `analyzeit` program on your machine to run an analysis and receives the computed result: totals, top groups, trends, forecasts, outlier counts and what drives a number. It never receives rows, cell values, file names or paths.

## Requirements

The AnalyzeIt command, version 0.5.1 or newer. This plugin does not install anything itself; it starts the program you installed:

```
curl -fsSL https://www.analyzeit.si/install.sh | sh
analyzeit data import sales.csv        # or: analyzeit connect ~/Reports
analyzeit data share sales on          # lets Claude see computed results of this dataset
```

A dataset is invisible to Claude until you run `analyzeit data share <dataset> on`; turn it off the same way. Restart Claude after installing.

## What you can do

| You type | What happens |
|---|---|
| `/analyzeit:analyze top 5 regions by revenue` | The analyst sub-agent picks the built-in analysis and answers from its result |
| `/analyzeit:overview sales` | A short briefing on one dataset: summary, top groups, trend, outliers, drivers |
| `/analyzeit:status` | Checks the install, the version and which datasets Claude may see |
| Just ask "which products drive revenue?" | The skill hands the question to the analyst |

Built-in analyses: summary, top groups, totals/averages/medians (overall or by group), trend by day/week/month/quarter/year, forecast, outliers, correlations, what drives a number, and comparison of groups with a significance test.

## What the plugin runs, sends and fetches

* **Runs:** `scripts/analyzeit-mcp.sh`, a short shell script that locates the `analyzeit` program, checks it is version 0.5.1 or newer and starts `analyzeit mcp` (an MCP server over stdio). It downloads nothing and runs no package manager.
* **Tools Claude gets:** `list_datasets` (names, row counts, column names and types of datasets you allowed), `analyze` (a computed result of one built-in analysis), seven named-input versions of the same analyses (`summary`, `top_groups`, `trend`, `forecast`, `find_outliers`, `drivers`, `compare_groups`) `browser_open`, `browser_snapshot` and `browser_act` (Claude drives your own signed-in browser on any website, step by step, through the AnalyzeIt extension on your computer; sign-in is yours, irreversible clicks ask you first), `propose_browser_task`, `browser_task_status` and `draft_post` (you plan steps for your own signed-in browser, handed straight to the AnalyzeIt extension on your computer, you approve them on AnalyzeIt and in the AnalyzeIt browser extension, and the task waits while you sign in; nothing runs or posts without you; needs `analyzeit login` and 0.6.1 or newer) and `privacy_policy`. All of them need `analyzeit` 0.6.0 or newer for the named-input tools; `analyze` works from 0.5.1.
* **Sends:** nothing from the plugin itself. The program answers from your encrypted local vault and works offline. What Claude is shown is sent to Anthropic like anything you type into Claude; that is the computed result, not your data.
* **Never available:** a tool that returns rows, runs SQL, or reads files. This is enforced in the program (`core/src/egress.rs`), not by asking Claude to behave: private datasets return nothing, columns that are nearly unique per row (ids, names, emails) cannot be grouped by, groups of fewer than 3 records are left out, tables are capped at 50 rows and cells at 80 characters. Tests plant canary values and use a stub server to prove none reach the output.
* **Credentials:** none are requested, stored or sent by the plugin.

`analyzeit policy` prints the rule in words.

## Install the plugin

```
claude plugin marketplace add AnalyzeItTech/analyzeit-plugin
claude plugin install analyzeit@analyzeit
```

Or without the plugin: `claude mcp add --scope user analyzeit -- analyzeit mcp`. The installer also registers the server with Claude Code and Claude Desktop for you.

## Where it works

Claude Code and Claude Desktop on your computer (it needs to start a local program). It does not load in claude.ai chat in a browser or on mobile; for assistants that cannot run local programs there is an optional hosted connector for data kept in an AnalyzeIt account.

## Support

Documentation: https://www.analyzeit.si/docs. Support: https://www.analyzeit.si/contact. Privacy policy: https://www.analyzeit.si/privacy. Security reports: see SECURITY.md in the repository. MIT licensed.
