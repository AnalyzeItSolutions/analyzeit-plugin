#!/bin/sh
# Starts `analyzeit mcp` (the results-only tool server). Claude Desktop does not always have ~/.local/bin on PATH,
# so look in the places the installer uses. Refuses an old command: before 0.5.1 `mcp` is not a subcommand, and
# an old build would treat the word as a question for the online service.
MIN="0.5.1"

bin="${ANALYZEIT_BIN:-}"
if [ -z "$bin" ]; then
  bin="$(command -v analyzeit 2>/dev/null || true)"
fi
if [ -z "$bin" ]; then
  for d in "${HOME:-/nonexistent}/.local/bin" /usr/local/bin /opt/homebrew/bin; do
    if [ -x "$d/analyzeit" ]; then bin="$d/analyzeit"; break; fi
  done
fi
if [ -z "$bin" ] || [ ! -x "$bin" ]; then
  echo "AnalyzeIt is not installed. Install it from https://www.analyzeit.si/download (then restart Claude)" >&2
  exit 1
fi

have="$("$bin" --version 2>/dev/null | sed -n 's/^analyzeit \([0-9][0-9.]*\).*/\1/p' | head -n 1)"
if [ -z "$have" ]; then
  echo "Could not read the version of $bin. Reinstall AnalyzeIt from https://www.analyzeit.si/download" >&2
  exit 1
fi
oldest="$(printf '%s\n%s\n' "$MIN" "$have" | sort -t. -k1,1n -k2,2n -k3,3n | head -n 1)"
if [ "$oldest" != "$MIN" ]; then
  echo "AnalyzeIt $have is too old for this plugin (needs $MIN or newer). Run: analyzeit update" >&2
  exit 1
fi

# In Claude the plugin also connects to the hosted server (analyzeit-cloud), so the local server does not list the online tools a
# second time. Codex has no hosted server in the plugin and passes --with-online, so a signed-in person gets them from here.
if [ "${1:-}" = "--with-online" ]; then
  exec "$bin" mcp
fi
ANALYZEIT_MCP_ONLINE=off exec "$bin" mcp
