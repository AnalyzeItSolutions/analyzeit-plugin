// Stores the website session token for this plugin only (owner-readable file).
import { chmodSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const file = (cfg) => join(cfg.dir, "session.json");

export function loadToken(cfg) {
  if (cfg.token) return cfg.token;
  try {
    const s = JSON.parse(readFileSync(file(cfg), "utf8"));
    return s.api === cfg.api && typeof s.token === "string" ? s.token : "";
  } catch { return ""; }
}

export function saveToken(cfg, token, email) {
  mkdirSync(cfg.dir, { recursive: true, mode: 0o700 });
  writeFileSync(file(cfg), JSON.stringify({ api: cfg.api, token, email }), { mode: 0o600 });
  chmodSync(file(cfg), 0o600);
}

export function clearToken(cfg) {
  rmSync(file(cfg), { force: true });
}
