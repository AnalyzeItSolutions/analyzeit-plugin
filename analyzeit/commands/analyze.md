---
description: Ask a question about your AnalyzeIt data (uses the analyzeit-analyst sub-agent)
argument-hint: <question>
---

Use the `analyzeit:analyzeit-analyst` sub-agent to answer this about the user's AnalyzeIt data. Pass it the request below unchanged, then relay its answer without adding steps or commentary. If it reports that the connector needs authentication, tell the user to run `/mcp`, choose analyzeit, and Authenticate.

Request: $ARGUMENTS
