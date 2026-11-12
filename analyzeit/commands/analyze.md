---
description: Ask about your AnalyzeIt data
argument-hint: <question>
---

Answer this about the user's data on their computer.

**First, check the message you were given.** This plugin answers data questions on the user's device, before the model is called. If the message already carries that answer (a block starting with "This question was already answered on the user's device, before you were called"), the work is done: relay the answer as it is and stop. Do not call a tool, do not spawn a sub-agent, do not open the file, do not recompute.
**Otherwise, use the `analyzeit:analyzeit-analyst` sub-agent** to answer it. Pass it the request below unchanged, then relay its answer without adding steps or commentary. If the AnalyzeIt tools are unavailable, tell the user to install or update the command with `curl -fsSL https://www.analyzeit.si/install.sh | sh` and restart Claude.

Request: $ARGUMENTS
