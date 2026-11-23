# AnalyzeIt for Claude (hosted)

Ask Claude about the data in your AnalyzeIt account and get exact calculations, through AnalyzeIt's hosted server. Analyses run on AnalyzeIt's servers in code; Claude receives computed results (totals, top groups, trends, forecasts, outliers, drivers, comparisons), never rows.

This version runs nothing on your computer: it is one hosted MCP server plus a skill, an analyst agent and four commands, all plain Markdown and JSON. For analysing files that stay on your own computer, use the AnalyzeIt app and command from https://www.analyzeit.si/download.

## Install

```
/plugin install analyzeit-cloud --marketplace AnalyzeItSolutions/analyzeit-plugin
```

## What you can do

| You type | What happens |
|---|---|
| Just ask "what was revenue by month last quarter?" | Claude finds the table in your account and answers from a computed result |
| `/analyzeit-cloud:analyze top 5 regions by revenue` | The analyst sub-agent picks the analysis and answers from its result |
| `/analyzeit-cloud:overview sales` | A short briefing on one table: summary, top groups, trend, outliers, drivers |
| `/analyzeit-cloud:status` | Checks sign-in, your plan and its limits, and your projects |
| `/analyzeit-cloud:browse <task>` | Works on a website in your own signed-in browser through the AnalyzeIt extension |

## What it connects to and sends

* **Server:** `https://api.analyzeit.si/mcp`, run by AnalyzeIt. You sign in to your AnalyzeIt account in the browser (OAuth) on first use; nothing is sent before you do. The plugin requests, stores and sends no credentials itself.
* **Tools:** your projects and tables, named analyses (`summary`, `aggregate`, `top_groups`, `trend`, `forecast`, `find_outliers`, `drivers`, `compare_groups`, `compare_periods`, `why_changed`, `concentration`, `cohort_retention`, `funnel`), `compute` (finance, units, dates, currency, stocks, weather, statistics), `remember` and `recall` (your AnalyzeIt memory), read-only workspace tools (plan, dashboards, runs, digests), world layers, and browser tools for your linked extension.
* **Changes need you:** Claude cannot change your data. Access requests, edits, imports and new connections come back as a link you approve on the AnalyzeIt website.
* **What goes to AnalyzeIt:** what Claude sends a tool: calculation inputs, notes to remember. What Claude is shown is also sent to Anthropic, like anything you type into Claude.

Privacy policy: https://www.analyzeit.si/privacy. Terms: https://www.analyzeit.si/terms.

## Support

Documentation: https://www.analyzeit.si/docs. Support: https://www.analyzeit.si/contact. Security reports: see SECURITY.md in the repository. MIT licensed.
