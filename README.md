# AnalyzeIt for Claude

Ask Claude about the data on your computer. **Your data stays stored on your computer**, and Claude only ever gets computed results, never rows.

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

This plugin is a thin layer: a small launcher script (`analyzeit/scripts/analyzeit-mcp.sh`, which checks the command is installed and new enough) starts `analyzeit mcp` (a tool server over stdio, part of the command line program). That program answers from your encrypted local vault. By default it runs the analysis on your computer and works with no network.

**Cloud compute (optional, off by default).** `analyzeit compute cloud` moves the analysis to AnalyzeIt's compute service: for each question, only the columns that analysis needs are sent over HTTPS, analysed in memory and not stored or logged, and the result is saved on your computer (`results.jsonl`). Your data stays stored on your computer either way, and the same results-only rules apply in the service. If the service cannot be reached, the analysis runs locally. `analyzeit compute device` turns it off.

**Claude.ai and ChatGPT.** They cannot reach your computer, so `analyzeit relay install` (signed in) runs a small relay at login: the hosted AnalyzeIt connector passes their questions about your shared datasets to it, it answers with computed results (in the compute service if cloud compute is on), saves them on your computer and sends back the result. The question and result pass through AnalyzeIt's servers and are deleted once read; rows never do. The connector lists these tools (`computer_datasets`, `computer_analyze`) only after your computer has connected.

**Reports of what AnalyzeIt could not answer.** When a question falls back to Claude (the hook could not read it, a tool refused, or Claude read the file anyway), `analyzeit misses` lists it on your computer. When you are signed in, a report also goes to the AnalyzeIt team so the missing analysis can be built: the reason, the question with your data's values masked, the dataset's row count and column names and types, and the program version. No rows. `analyzeit misses share full` adds the question as written; `analyzeit misses share off` sends nothing. Reports are kept 180 days and never used to train models.

| Tool | What Claude gets |
|---|---|
| `list_datasets` | Names, row counts, column names and types of the datasets **you allowed** |
| `analyze` | A computed result of a built-in analysis, asked in plain words |
| `summary`, `top_groups`, `trend`, `forecast`, `find_outliers`, `drivers`, `compare_groups` | The same results-only analyses with named inputs (dataset, column, measure), so Claude does not have to phrase a question. Names are checked: letters, digits, spaces, `_ . -` only |
| `browser_open`, `browser_snapshot`, `browser_act` | Claude works in **your own signed-in browser on any website**: open a page, read it, click, type, press keys, scroll. Goes straight to the AnalyzeIt extension on your computer (no website). Sign-in is always yours; Post/Send/Buy/Delete-style clicks show an Allow/Deny box on the page. Needs CLI 0.6.1+ and `analyzeit extension connect` |
| `propose_browser_task`, `browser_task_status` | Claude plans steps for **your own signed-in browser** (read your X or LinkedIn profile, put a post you gave it in the box). You approve them on AnalyzeIt, then in the browser extension's own window; if you are signed out it waits while you sign in. Needs `analyzeit login`, CLI 0.6.1+ |
| `draft_post` | Saves a post in your Drafts in your voice. Nothing is posted |
| `privacy_policy` | What is stored on your computer, what may be processed by the compute service, and what reaches Claude |

There is **no** tool that returns rows, runs SQL or reads files. That is enforced in the program (`core/src/egress.rs`), not by asking Claude to behave: private datasets return nothing; columns that are nearly unique per row (ids, names, emails) cannot be grouped by; groups of fewer than 3 records are left out; tables are capped at 50 rows and cells at 80 characters. Tests use planted canary values and a stub server to prove none reach the output.

What Claude is told is sent to Anthropic like anything you type into Claude. That is the computed result, not your data. `analyzeit policy` prints the rule.

## Manual install

```
claude plugin marketplace add AnalyzeItSolutions/analyzeit-plugin
claude plugin install analyzeit@analyzeit
```
or without the plugin: `claude mcp add --scope user analyzeit -- analyzeit mcp`. Claude Desktop: add `"analyzeit": {"command": "analyzeit", "args": ["mcp"]}` under `mcpServers` in `claude_desktop_config.json`.

## Codex

The same folder is a Codex plugin (`analyzeit/.codex-plugin/plugin.json`, marketplace in `.agents/plugins/marketplace.json`). It
uses the same hooks file and the same scripts, and needs analyzeit 0.9.0 or newer for the hooks (older versions are skipped).

- Add this repository (or a local copy) as a plugin marketplace in Codex and enable **AnalyzeIt**.
- Codex runs a plugin's hooks only after you trust them: open `/hooks` in Codex and trust the AnalyzeIt ones.
- The prompt hook answers a data question about a dataset you shared before the model is called; the tool hook notes when the
  assistant read a dataset's file anyway. `analyzeit misses` lists those, on your computer only.
- In Codex the local server also offers your online AnalyzeIt projects when you are signed in (`analyzeit login`).

## Online projects (optional)

Data kept in your AnalyzeIt *account* can also be reached through the hosted connector for assistants that cannot run local programs: see [docs/hosted-connector.md](docs/hosted-connector.md).

## Develop

`node test/check.mjs` validates the manifests, the directory-listing requirements (README, license, icon, no stray files), the launcher (including its version gate) and scans the package for secrets. `claude plugin validate . --strict` and `claude plugin validate ./analyzeit --strict` must also pass.
