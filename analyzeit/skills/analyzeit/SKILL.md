---
name: analyzeit
description: How to work with AnalyzeIt from Claude. Use when the user mentions AnalyzeIt, their AnalyzeIt projects or data, or asks to analyse, total, group, trend or check data that lives in AnalyzeIt.
---

# Working with AnalyzeIt

AnalyzeIt holds the user's data and computes exact aggregates. This plugin connects Claude to it through a hosted, read-only connector, and makes **you** the model: you do the planning, checking and writing that AnalyzeIt's own assistant would do.

**Delegate to the `analyzeit:analyzeit-analyst` sub-agent** for any data question (Agent tool, `subagent_type: analyzeit:analyzeit-analyst`), passing the user's question verbatim.

**Connecting:** the first time, the connector needs the user to sign in. In Claude Code they run `/mcp`, pick `analyzeit`, and choose Authenticate; a browser opens on the AnalyzeIt website where they log in however they like and click Allow. You never handle a password or token.

**What the user controls on the website:** which projects (and tables) AI may read (off by default), connectors, uploads, and disconnecting this app under Profile → Connected AI apps. If a result says access is not allowed, relay that and the link; do not try to work around it.
