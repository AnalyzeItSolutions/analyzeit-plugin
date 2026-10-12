# AnalyzeIt plugin for Claude

Claude takes the place of AnalyzeIt's own LLM. A sub-agent (`analyzeit-analyst`) does the planning, checking and answer-writing; AnalyzeIt's on-device engine (encrypted vault, built-in analyses, read-only SQL, local dashboards) is its toolset, exposed by a small MCP server that wraps the `analyzeit` CLI.

```
Claude ──▶ analyzeit-analyst (sub-agent) ──▶ MCP tools ──▶ `analyzeit` CLI ──▶ local vault
                 (replaces the hosted LLM)                    (no network)
```

## Install

```
curl -fsSL https://www.analyzeit.in/install.sh | sh     # the CLI (0.5.0+ for `data`/`sql`)
claude plugin marketplace add AnalyzeItTech/claude-plugin
claude plugin install analyzeit@analyzeit
```

Set `ANALYZEIT_BIN` if the CLI is not on `PATH`. Then: `/analyzeit:analyze top 5 regions by revenue in sales.csv`, or just ask about your data.

## Tools

`analyzeit_status`, `list_datasets`, `profile_dataset`, `run_sql`, `analyze`, `import_data`, `pin_widget`, `show_dashboard`.

## Data stays on the device

There is no tool that uploads data or calls the hosted service. `analyze` and `pin_widget` (with a request) refuse datasets that allow summary sharing, because an unrecognised request would otherwise be forwarded to AnalyzeIt's hosted LLM; use `run_sql` there. Claude itself does receive the results of the tools it calls, as with any connected assistant.

## Test

`node analyzeit/test/smoke.mjs` drives the server against a stand-in CLI.
