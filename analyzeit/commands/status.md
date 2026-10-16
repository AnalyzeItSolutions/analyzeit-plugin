---
description: Check that AnalyzeIt is installed and which of your datasets Claude may analyse
---

Check the AnalyzeIt setup for the user.

1. Call the AnalyzeIt `list_datasets` tool directly (not through a sub-agent). If the tool does not exist, the server did not start: say that the `analyzeit` command is missing or older than 0.5.1 and give `curl -fsSL https://www.analyzeit.si/install.sh | sh` (or `analyzeit update`), then to restart Claude. Stop.
2. If the list is empty: say no dataset is allowed yet and show `analyzeit data import <file>` followed by `analyzeit data share <dataset> on`.
3. Otherwise list each dataset with its row count and columns on one line, and remind them `analyzeit data share <dataset> off` hides one again.
4. Call `privacy_policy` and quote its "never" line.

Keep it to a short checklist. Do not analyse anything.
