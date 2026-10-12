# Security

This repository is a thin package: the connector address, an analyst sub-agent and documentation. The connector itself (sign-in, permissions, tools) runs on AnalyzeIt's servers.

## Reporting a vulnerability

Please do not open a public issue. Use GitHub's private reporting: **Security → Report a vulnerability** on this repository. Include what you found, how to reproduce it, and what it could expose.

Reports about the connector service (sign-in flow, permission checks, token handling, the approval pages) are as welcome as reports about this repository.

## What is in scope and what protects users

- Assistants get their own revocable, hour-long tokens that work only on the connector; passwords and website sessions never reach them.
- Reading data is off until the user allows it, per project or table. Access requests, changes and new connections are snapshots the user approves.
- Approving from the chat is an optional tick-box at sign-in, off unless ticked, and limited in size and scope.

Details for users are in the README.
