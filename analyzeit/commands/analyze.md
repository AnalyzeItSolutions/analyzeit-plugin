---
description: Ask about your AnalyzeIt data
argument-hint: <question>
---

Use the `analyzeit:analyzeit-analyst` sub-agent to answer this about the user's data on their computer. Pass it the request below unchanged, then relay its answer without adding steps or commentary. If the AnalyzeIt tools are unavailable, tell the user to install or update the command with `curl -fsSL https://www.analyzeit.si/install.sh | sh` and restart Claude.

Request: $ARGUMENTS
