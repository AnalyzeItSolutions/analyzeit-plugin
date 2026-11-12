---
description: AnalyzeIt install and shared datasets
---

Check the AnalyzeIt setup for the user.

1. Call the AnalyzeIt `list_datasets` tool directly (not through a sub-agent). If the tool does not exist, the server did not start: say that the `analyzeit` command is missing or older than 0.5.1 and give `curl -fsSL https://www.analyzeit.si/install.sh | sh` (or `analyzeit update`), then to restart Claude. Stop.
2. If the list is empty: say no dataset is allowed yet and show `analyzeit data import <file>` followed by `analyzeit data share <dataset> on`.
3. Otherwise list each dataset with its row count and columns on one line, and remind them `analyzeit data share <dataset> off` hides one again.
4. Call `privacy_policy` and quote its "never" line.
5. Say whether the pre-answer hook is installed: run `analyzeit doctor` and report the "plugin installed:" line. A plugin version that has no `hooks/hooks.json` answers nothing before the model is called, so the question is answered by the model instead (at the model's cost). Tell the user to update the plugin (`claude plugin update analyzeit@analyzeit`) or reinstall it from https://www.analyzeit.si/download when it is missing or older than 0.14.0.

Keep it to a short checklist. Do not analyse anything.
