---
description: A short briefing on one dataset
argument-hint: <dataset name>
---

Use the `analyzeit:analyzeit-analyst` sub-agent to brief the user on one dataset. If no dataset is named below and several are allowed, list them and ask which one.

Have it make these calls on the dataset (skip any that do not fit the columns, and say which were skipped): `summary`; the top groups of the main category column by the main numeric column; the monthly trend of that column if there is a date column; `outliers in` that column; `what drives` it. Then relay a single briefing: the three most useful findings first, one table at most, and the caveats (left-out groups, private or refused analyses). Do not narrate the calls.

Dataset: $ARGUMENTS
