import { homedir } from "node:os";
import { join } from "node:path";

// Public endpoints of the AnalyzeIt service. Override for self-hosted or local development.
const DEFAULT_API = "https://backend-qwiq.onrender.com";
const DEFAULT_SITE = "https://www.analyzeit.in";

function origin(value, fallback, name) {
  const raw = (value || fallback).replace(/\/+$/, "");
  let u;
  try { u = new URL(raw); } catch { throw new Error(`${name} is not a valid URL`); }
  const local = u.hostname === "localhost" || u.hostname === "127.0.0.1";
  if (!(u.protocol === "https:" || (u.protocol === "http:" && local)) || u.username || u.password || u.pathname !== "/" || u.search || u.hash) {
    throw new Error(`${name} must be an https origin (http only for localhost)`);
  }
  return u.origin;
}

export function loadConfig(env = process.env) {
  return {
    api: origin(env.ANALYZEIT_API_URL, DEFAULT_API, "ANALYZEIT_API_URL"),
    site: origin(env.ANALYZEIT_SITE_URL, DEFAULT_SITE, "ANALYZEIT_SITE_URL"),
    token: env.ANALYZEIT_TOKEN || "",
    dir: env.ANALYZEIT_PLUGIN_HOME || join(env.XDG_CONFIG_HOME || join(homedir(), ".config"), "analyzeit-claude-plugin"),
  };
}
