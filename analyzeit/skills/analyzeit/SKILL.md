---
name: analyzeit
description: How to work with AnalyzeIt from Claude. Use when the user mentions AnalyzeIt, their AnalyzeIt projects or data, or asks to analyse, total, group, trend or check data that lives in AnalyzeIt.
---

# Working with AnalyzeIt

AnalyzeIt holds the user's data and computes exact aggregates on its servers. This plugin makes **you** the model: the `analyzeit` MCP tools read the data through the AnalyzeIt website's API, and you do the planning, checking and writing that AnalyzeIt's own assistant would do.

**Delegate to the `analyzeit-analyst` sub-agent** for any data question (Agent tool, `subagent_type: analyzeit-analyst`), passing the user's question verbatim. Do the work yourself only for a trivial lookup such as listing projects.

Everything the user must do happens on the AnalyzeIt website: signing in (the `login` tool opens it, the user clicks Allow), uploading files, connecting sources, billing. The plugin never handles passwords or changes data. Use `open_in_website` to take the user to the right page.

Tools (prefix `mcp__analyzeit__`): `login`, `whoami`, `logout`, `list_projects`, `list_objects`, `list_datasets`, `query_records`, `aggregate`, `open_in_website`.
