#!/usr/bin/env node
// AnalyzeIt MCP server (no dependencies).
//   node index.mjs                    stdio (Claude, Cursor, VS Code, Codex CLI, Gemini CLI, Zed, ...)
//   node index.mjs --http [--port N]  Streamable HTTP on 127.0.0.1 for clients that connect by URL
// Signs the user in through the AnalyzeIt website and reads their data through its API. It never calls
// AnalyzeIt's hosted assistant: the connected assistant does the reasoning.
import { createInterface } from "node:readline";
import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.mjs";
import { handleMessage } from "./rpc.mjs";

const send = (m) => process.stdout.write(`${JSON.stringify(m)}\n`);

export function runStdio(cfg) {
  createInterface({ input: process.stdin }).on("line", (line) => {
    if (!line.trim()) return;
    let msg;
    try { msg = JSON.parse(line); } catch { return send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }); }
    handleMessage(cfg, msg)
      .then((r) => r && send(r))
      .catch((e) => msg.id !== undefined && send({ jsonrpc: "2.0", id: msg.id, error: { code: -32603, message: String(e.message || e) } }));
  });
}

const LOCAL_HOST = /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/;

/** Streamable HTTP, request/response only (no SSE). Local only: refuses foreign Host/Origin headers. */
export function createHttpServer(cfg, { token = process.env.ANALYZEIT_MCP_TOKEN || "" } = {}) {
  return createServer(async (req, res) => {
    const reply = (status, body, headers = {}) => {
      res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store", ...headers });
      res.end(body === undefined ? "" : JSON.stringify(body));
    };
    const origin = req.headers.origin;
    if (!LOCAL_HOST.test(req.headers.host || "")) return reply(403, { error: "forbidden host" });
    if (origin && !LOCAL_HOST.test(origin.replace(/^https?:\/\//, ""))) return reply(403, { error: "forbidden origin" });
    if (token) {
      const got = Buffer.from((req.headers.authorization || "").replace(/^Bearer /, ""));
      const want = Buffer.from(token);
      if (got.length !== want.length || !timingSafeEqual(got, want)) return reply(401, { error: "unauthorized" });
    }
    if (new URL(req.url, "http://x").pathname !== "/mcp") return reply(404, { error: "not found" });
    if (req.method !== "POST") return reply(405, { error: "POST only" }, { allow: "POST" });
    let raw = "";
    for await (const c of req) { raw += c; if (raw.length > 1_000_000) return reply(413, { error: "too large" }); }
    let msg;
    try { msg = JSON.parse(raw); } catch { return reply(400, { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }); }
    const batch = Array.isArray(msg);
    const out = (await Promise.all((batch ? msg : [msg]).map((m) => handleMessage(cfg, m).catch((e) => ({ jsonrpc: "2.0", id: m?.id ?? null, error: { code: -32603, message: String(e.message || e) } }))))).filter(Boolean);
    if (!out.length) return reply(202);
    reply(200, batch ? out : out[0]);
  });
}

const isMain = process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  let cfg;
  try { cfg = loadConfig(); } catch (e) { process.stderr.write(`${e.message}\n`); process.exit(1); }
  const args = process.argv.slice(2);
  if (args.includes("--http")) {
    const port = Number(args[args.indexOf("--port") + 1]) || 8765;
    createHttpServer(cfg).listen(port, "127.0.0.1", () => process.stderr.write(`AnalyzeIt MCP on http://127.0.0.1:${port}/mcp\n`));
  } else {
    runStdio(cfg);
  }
}
