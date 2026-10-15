---
description: Ask a question about your local AnalyzeIt data (uses the analyzeit-analyst sub-agent)
argument-hint: <question>
---

Use the `analyzeit:analyzeit-analyst` sub-agent to answer this about the user's data on their computer. Pass it the request below unchanged, then relay its answer without adding steps or commentary. If the AnalyzeIt tools are unavailable, tell the user to install the command with `curl -fsSL https://www.analyzeit.si/install.sh | sh` and restart Claude.

Request: $ARGUMENTS
