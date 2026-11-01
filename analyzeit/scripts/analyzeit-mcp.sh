#!/bin/sh
# Starts `analyzeit mcp` (the results-only tool server). Claude Desktop does not always have ~/.local/bin on PATH,
# so look in the places the installer uses. Refuses an old command: before 0.5.1 `mcp` is not a subcommand, and
# an old build would treat the word as a question for the online service.
MIN="0.5.1"

# ANALYZEIT_BIN wins. Otherwise every copy found (PATH first, then the installer's places) is checked and the newest one that
# is new enough is used: an old copy left earlier on PATH (/usr/local/bin) must not hide a current one in ~/.local/bin.
version_of() { "$1" --version 2>/dev/null | sed -n 's/^analyzeit \([0-9][0-9.]*\).*/\1/p' | head -n 1; }
newer_or_equal() { [ "$(printf '%s\n%s\n' "$1" "$2" | sort -t. -k1,1n -k2,2n -k3,3n | head -n 1)" = "$2" ]; }

bin="${ANALYZEIT_BIN:-}"
best=""
best_v=""
oldest_seen=""
if [ -z "$bin" ]; then
  for c in "$(command -v analyzeit 2>/dev/null || true)" "${HOME:-/nonexistent}/.local/bin/analyzeit" /usr/local/bin/analyzeit /opt/homebrew/bin/analyzeit; do
    [ -n "$c" ] && [ -x "$c" ] || continue
    v="$(version_of "$c")"
    [ -n "$v" ] || continue
    oldest_seen="$v"
    # new enough, and newer than the best so far; between equal versions the installer's own place (~/.local/bin) wins
    if newer_or_equal "$v" "$MIN" && { [ -z "$best_v" ] || { newer_or_equal "$v" "$best_v" && [ "$v" != "$best_v" ]; } || { [ "$v" = "$best_v" ] && [ "$c" = "${HOME:-/nonexistent}/.local/bin/analyzeit" ]; }; }; then
      best="$c"
      best_v="$v"
    fi
  done
  bin="$best"
fi
if [ -z "$bin" ] && [ -n "$oldest_seen" ]; then
  echo "AnalyzeIt $oldest_seen is too old for this plugin (needs $MIN or newer). Run: analyzeit update" >&2
  exit 1
fi
if [ -z "$bin" ] || [ ! -x "$bin" ]; then
  echo "AnalyzeIt is not installed. Install it from https://www.analyzeit.si/download (then restart Claude)" >&2
  exit 1
fi
have="$(version_of "$bin")"
if [ -z "$have" ]; then
  echo "Could not read the version of $bin. Reinstall AnalyzeIt from https://www.analyzeit.si/download" >&2
  exit 1
fi
if ! newer_or_equal "$have" "$MIN"; then
  echo "AnalyzeIt $have is too old for this plugin (needs $MIN or newer). Run: analyzeit update" >&2
  exit 1
fi

# In Claude the plugin also connects to the hosted server (analyzeit-cloud), so the local server does not list the online tools a
# second time. Codex has no hosted server in the plugin and passes --with-online, so a signed-in person gets them from here.
if [ "${1:-}" = "--with-online" ]; then
  exec "$bin" mcp
fi
ANALYZEIT_MCP_ONLINE=off exec "$bin" mcp
