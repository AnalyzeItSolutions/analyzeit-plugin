---
description: AnalyzeIt sign-in, plan and projects
---

Check the AnalyzeIt setup for the user.

1. Call `my_plan` directly (not through a sub-agent). If the tool does not exist or asks for sign-in, say the user needs to sign in to AnalyzeIt in the browser (Claude opens the page on first use; in Claude Code, `/mcp` shows the server), then stop.
2. Report the plan and this month's limits in one line.
3. Call `list_projects`. If there are none, say so and point to https://www.analyzeit.si to upload a file or connect a source. Otherwise list each project with its tables on one line.

Keep it to a short checklist. Do not analyse anything.
