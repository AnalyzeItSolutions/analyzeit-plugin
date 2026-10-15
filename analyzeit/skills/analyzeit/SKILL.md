---
name: analyzeit
description: How to work with AnalyzeIt from Claude. Use when the user mentions AnalyzeIt, their local datasets, or asks to total, group, trend, forecast or check data kept in AnalyzeIt on their computer.
---

# Working with AnalyzeIt

AnalyzeIt keeps the user's data **on their own computer** and analyses it there. This plugin starts the `analyzeit` command as a tool server (`analyzeit mcp`). It gives you **computed results only**: totals, averages, counts per group, trends, forecasts, outlier counts and drivers. It has no tool that reads rows, runs SQL or opens files, by design.

**Delegate to the `analyzeit:analyzeit-analyst` sub-agent** for any data question (Agent tool, `subagent_type: analyzeit:analyzeit-analyst`), passing the user's question verbatim.

**If the tools are missing:** the `analyzeit` command is not installed or not on PATH. Tell the user to run `curl -fsSL https://www.analyzeit.in/install.sh | sh`, then restart Claude.

**What the user controls:** a dataset is invisible to you until they allow it with `analyzeit data share <dataset> on` (or the switch on the dataset's page in the desktop app). They can turn that off any time. `privacy_policy` says exactly what stays on the device; quote it if asked where their data goes. Do not try to work around a refusal, and never ask for files, rows or credentials.
