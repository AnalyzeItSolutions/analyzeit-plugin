---
description: A short briefing on one table in your AnalyzeIt account
argument-hint: <project or table name>
---

Use the `analyzeit-cloud:analyzeit-analyst` sub-agent to brief the user on one table in their AnalyzeIt account. If none is named below and several exist, list them and ask which one.

Have it make these calls on the table (skip any that do not fit the columns, and say which were skipped): `summary`; `top_groups` of the main category column by the main numeric column; `trend` of that column if there is a date column; `find_outliers` in that column; `drivers` of it. Then relay a single briefing: the three most useful findings first, one table at most, and the caveats. Do not narrate the calls.

Table: $ARGUMENTS
