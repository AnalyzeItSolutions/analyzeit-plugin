# Security

This repository is a thin package: it starts the `analyzeit` command (`analyzeit mcp`), an analyst sub-agent and documentation. There is no hosted service in the plugin's path; analyses run on the user's computer.

## Reporting a vulnerability

Please do not open a public issue. Use GitHub's private reporting: **Security → Report a vulnerability** on this repository. Include what you found, how to reproduce it, and what it could expose.

Reports about the connector service (sign-in flow, permission checks, token handling, the approval pages) are as welcome as reports about this repository.

## What is in scope and what protects users

- The tool server returns computed results only. It has no tool that returns rows, runs SQL or reads files; a dataset is invisible until the user allows it (`analyzeit data share <dataset> on`); id-like columns and groups under 3 records are refused. Bypasses of that rule are the most valuable reports (`core/src/egress.rs`).
- The local endpoint binds 127.0.0.1 only, requires bearer tokens kept in an owner-only file, rejects browser requests (no Origin) and wrong Host headers. The plugin's token can only reach the results-only routes.
- The installer verifies a SHA-256 (and, with `minisign` installed, a signature) before installing anything.

Details for users are in the README.
