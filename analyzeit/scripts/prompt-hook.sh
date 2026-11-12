#!/bin/sh
# Hooks for Claude Code and Codex. `prompt` (UserPromptSubmit): `analyzeit hook prompt` answers a data question about a dataset the message names, on this computer, before
# the model sees the message, and adds the computed result (never rows) as context. Silent when it has nothing to add.
# `stop` (Stop): measures the turn's tokens from the transcript for `analyzeit savings` (kept on this computer).
# `tool` (PostToolUse): notes when the assistant reads a shared dataset's file anyway, for `analyzeit misses` (kept on this computer).
# Needs 0.9.0 or newer: an older analyzeit would read "hook prompt" as a question for the online service, so it is never called.
MIN="0.9.0"

# The same rule as scripts/analyzeit-mcp.sh: every copy found is checked and the newest one that is new enough wins. An old copy left
# earlier on PATH (/usr/local/bin) must not hide a current one in ~/.local/bin, or the hook would answer with the old build.
version_of() { "$1" --version 2>/dev/null | sed -n 's/^analyzeit \([0-9][0-9.]*\).*/\1/p' | head -n 1; }
newer_or_equal() { [ "$(printf '%s\n%s\n' "$1" "$2" | sort -t. -k1,1n -k2,2n -k3,3n | head -n 1)" = "$2" ]; }

bin="${ANALYZEIT_BIN:-}"
if [ -z "$bin" ]; then
  best=""
  best_v=""
  for c in "$(command -v analyzeit 2>/dev/null || true)" "${HOME:-/nonexistent}/.local/bin/analyzeit" /usr/local/bin/analyzeit /opt/homebrew/bin/analyzeit; do
    [ -n "$c" ] && [ -x "$c" ] || continue
    v="$(version_of "$c")"
    [ -n "$v" ] || continue
    # new enough, and newer than the best so far; between equal versions the installer's own place (~/.local/bin) wins
    if newer_or_equal "$v" "$MIN" && { [ -z "$best_v" ] || { newer_or_equal "$v" "$best_v" && [ "$v" != "$best_v" ]; } || { [ "$v" = "$best_v" ] && [ "$c" = "${HOME:-/nonexistent}/.local/bin/analyzeit" ]; }; }; then
      best="$c"
      best_v="$v"
    fi
  done
  bin="$best"
fi
[ -n "$bin" ] && [ -x "$bin" ] || exit 0

have="$(version_of "$bin")"
[ -n "$have" ] || exit 0
# An older command would read "hook prompt" as a question for the online service: it is never called.
newer_or_equal "$have" "$MIN" || exit 0

case "${1:-prompt}" in
  prompt|tool|stop) exec "$bin" hook "${1:-prompt}" ;;
esac
exit 0
