#!/bin/sh
# Hooks for Claude Code and Codex. `prompt` (UserPromptSubmit): `analyzeit hook prompt` answers a data question about a dataset the message names, on this computer, before
# the model sees the message, and adds the computed result (never rows) as context. Silent when it has nothing to add.
# `stop` (Stop): measures the turn's tokens from the transcript for `analyzeit savings` (kept on this computer).
# `tool` (PostToolUse): notes when the assistant reads a shared dataset's file anyway, for `analyzeit misses` (kept on this computer).
# Needs 0.9.0 or newer: an older analyzeit would read "hook prompt" as a question for the online service, so it is never called.
MIN="0.9.0"

bin="${ANALYZEIT_BIN:-}"
if [ -z "$bin" ]; then
  bin="$(command -v analyzeit 2>/dev/null || true)"
fi
if [ -z "$bin" ]; then
  for d in "${HOME:-/nonexistent}/.local/bin" /usr/local/bin /opt/homebrew/bin; do
    if [ -x "$d/analyzeit" ]; then bin="$d/analyzeit"; break; fi
  done
fi
[ -n "$bin" ] && [ -x "$bin" ] || exit 0

have="$("$bin" --version 2>/dev/null | sed -n 's/^analyzeit \([0-9][0-9.]*\).*/\1/p' | head -n 1)"
[ -n "$have" ] || exit 0
oldest="$(printf '%s\n%s\n' "$MIN" "$have" | sort -t. -k1,1n -k2,2n -k3,3n | head -n 1)"
[ "$oldest" = "$MIN" ] || exit 0

case "${1:-prompt}" in
  prompt|tool|stop) exec "$bin" hook "${1:-prompt}" ;;
esac
