---
name: analyzeit
description: How to work with AnalyzeIt from Claude. Use when the user mentions AnalyzeIt, their local datasets/vault, or asks to analyse, query, chart-in-dashboard or forecast data that AnalyzeIt holds.
---

# Working with AnalyzeIt

AnalyzeIt keeps data in an encrypted on-device vault and computes statistics deterministically. This plugin makes **you** the model: the `analyzeit` MCP tools are the engine, and you do the planning, checking and writing that AnalyzeIt's hosted LLM would do.

**Delegate to the `analyzeit-analyst` sub-agent** for any data question (Agent tool, `subagent_type: analyzeit-analyst`) and pass the user's question plus any file path verbatim. Do the work yourself only for a one-line lookup such as listing datasets.

Tools (prefix `mcp__analyzeit__`): `analyzeit_status`, `list_datasets`, `profile_dataset`, `run_sql`, `analyze`, `import_data`, `pin_widget`, `show_dashboard`.

If `analyzeit_status` says the CLI is missing, tell the user to install it (`curl -fsSL https://www.analyzeit.in/install.sh | sh`) rather than working around it.
