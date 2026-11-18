#!/bin/sh
# Claude Code's headersHelper for the hosted AnalyzeIt connector (api.analyzeit.si/mcp): prints the request headers as JSON, with the
# sign-in of the analyzeit command on this computer (`analyzeit login`), so the connector needs no sign-in of its own. Prints {} when
# there is no new-enough analyzeit or it is signed out; the connector then offers its own sign-in, as before.
MIN="0.9.6"
version_of() { "$1" --version 2>/dev/null | sed -n 's/^analyzeit \([0-9][0-9.]*\).*/\1/p' | head -n 1; }
newer_or_equal() { [ "$(printf '%s\n%s\n' "$1" "$2" | sort -t. -k1,1n -k2,2n -k3,3n | head -n 1)" = "$2" ]; }
best=""
best_v=""
for c in "${ANALYZEIT_BIN:-}" "$(command -v analyzeit 2>/dev/null || true)" "${HOME:-/nonexistent}/.local/bin/analyzeit" "${HOME:-/nonexistent}/.analyzeit/bin/analyzeit" "${HOME:-/nonexistent}/.cargo/bin/analyzeit" /usr/local/bin/analyzeit /opt/homebrew/bin/analyzeit; do
  [ -n "$c" ] && [ -x "$c" ] || continue
  v="$(version_of "$c")"
  [ -n "$v" ] && newer_or_equal "$v" "$MIN" || continue
  if [ -z "$best_v" ] || { newer_or_equal "$v" "$best_v" && [ "$v" != "$best_v" ]; }; then
    best="$c"
    best_v="$v"
  fi
done
if [ -n "$best" ]; then
  out="$("$best" mcp-headers 2>/dev/null)"
  case "$out" in
    "{"*) printf '%s\n' "$out"; exit 0 ;;
  esac
fi
printf '{}\n'
