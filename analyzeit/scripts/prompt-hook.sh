#!/bin/sh
# Hooks for Claude Code and Codex. `prompt` (UserPromptSubmit): `analyzeit hook prompt` answers a data question about a dataset the message names, on this computer, before
# the model sees the message, and adds the computed result (never rows) as context. Silent when it has nothing to add.
# `stop` (Stop): measures the turn's tokens from the transcript for `analyzeit savings` (kept on this computer).
# `tool` (PostToolUse): notes when the assistant reads a shared dataset's file anyway, for `analyzeit misses` (kept on this computer).
# `notice` (SessionStart): says, once, when the hook is off or cannot run; silent when it is on.
# The hook is on by default: installing the plugin is enough. Only `analyzeit hook off` or ANALYZEIT_PROMPT_HOOK=off turns it off.
# Needs 0.9.0 or newer: an older analyzeit would read "hook prompt" as a question for the online service, so it is never called.
MIN="0.9.0"

# The same rule as scripts/analyzeit-mcp.sh: every copy found is checked and the newest one that is new enough wins. An old copy left
# earlier on PATH (/usr/local/bin) must not hide a current one in ~/.local/bin, or the hook would answer with the old build.
version_of() { "$1" --version 2>/dev/null | sed -n 's/^analyzeit \([0-9][0-9.]*\).*/\1/p' | head -n 1; }
newer_or_equal() { [ "$(printf '%s\n%s\n' "$1" "$2" | sort -t. -k1,1n -k2,2n -k3,3n | head -n 1)" = "$2" ]; }

# Where AnalyzeIt keeps its local settings (the same folder the command uses for hook.json, misses and savings).
store_dir() {
  if [ -n "${ANALYZEIT_HOME:-}" ]; then
    printf '%s' "$ANALYZEIT_HOME"
  elif [ "$(uname -s)" = "Darwin" ]; then
    printf '%s/Library/Application Support/AnalyzeIt' "${HOME:-/nonexistent}"
  else
    printf '%s/AnalyzeIt' "${XDG_CONFIG_HOME:-${HOME:-/nonexistent}/.config}"
  fi
}

# A hook that cannot run must say so instead of passing unnoticed: `analyzeit doctor` reads this note and `notice` shows it once.
note_problem() {
  d="$(store_dir)"
  mkdir -p "$d" 2>/dev/null
  [ -d "$d" ] && printf '%s\n' "$1" > "$d/hook-problem.txt" 2>/dev/null
  printf 'AnalyzeIt: %s\n' "$1" >&2
}
# A message the hook could not hand to analyzeit is still counted: one line in the same event log the command writes (`analyzeit hook status`).
# Local only, never printed, and a failed write is ignored.
log_event() {
  d="$(store_dir)"
  [ -d "$d" ] && printf '{"at":%s,"outcome":"error","how":"hook could not run","route":"device","ms":0,"session":null,"prompt":"","problems":["%s"]}\n' "$(date +%s)" "$(printf '%s' "$1" | tr -d '"\\' | cut -c1-120)" >> "$d/hook-events.jsonl" 2>/dev/null
  return 0
}
clear_problem() { rm -f "$(store_dir)/hook-problem.txt" 2>/dev/null; }

bin="${ANALYZEIT_BIN:-}"
if [ -z "$bin" ]; then
  best=""
  best_v=""
  for c in "$(command -v analyzeit 2>/dev/null || true)" "${HOME:-/nonexistent}/.local/bin/analyzeit" "${HOME:-/nonexistent}/.analyzeit/bin/analyzeit" "${HOME:-/nonexistent}/.cargo/bin/analyzeit" /usr/local/bin/analyzeit /opt/homebrew/bin/analyzeit; do
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

not_installed() {
  msg="the analyzeit command is not installed, so data questions are not answered on this device before the model is called. Install it with: curl -fsSL https://www.analyzeit.si/install.sh | sh"
  note_problem "$msg"
  [ "${1:-prompt}" = "prompt" ] && log_event "$msg"
  # A one-time notice at session start, when the assistant can still tell the user before they ask anything.
  if [ "${1:-prompt}" = "notice" ]; then
    printf '{"systemMessage":"AnalyzeIt: %s"}\n' "$msg"
  fi
  exit 0
}

[ -n "$bin" ] && [ -x "$bin" ] || not_installed "$@"

have="$(version_of "$bin")"
[ -n "$have" ] || not_installed "$@"
# An older command would read "hook prompt" as a question for the online service: it is never called.
if ! newer_or_equal "$have" "$MIN"; then
  msg="analyzeit $have is too old for the pre-answer hook (it needs $MIN or newer), so data questions are not answered on this device before the model is called. Run analyzeit update."
  note_problem "$msg"
  [ "${1:-prompt}" = "prompt" ] && log_event "$msg"
  if [ "${1:-prompt}" = "notice" ]; then
    printf '{"systemMessage":"AnalyzeIt: %s"}\n' "$msg"
  fi
  exit 0
fi

# A working command: whatever was wrong before is no longer a problem.
clear_problem

case "${1:-prompt}" in
  prompt|tool|stop) exec "$bin" hook "${1:-prompt}" ;;
  # SessionStart: says when the hook was turned off explicitly, and nothing when it is on.
  notice) exec "$bin" hook notice ;;
esac
exit 0
