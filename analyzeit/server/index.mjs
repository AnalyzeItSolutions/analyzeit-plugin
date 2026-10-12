#!/usr/bin/env node
// AnalyzeIt MCP server (stdio, no dependencies).
// Exposes AnalyzeIt's on-device engine to a connected assistant by calling the
// `analyzeit` CLI. Nothing here talks to AnalyzeIt's hosted service or its LLM:
// the connected assistant is the one doing the reasoning.
import { execFile } from "node:child_process";
import { createInterface } from "node:readline";

const BIN = process.env.ANALYZEIT_BIN || "analyzeit";
const TIMEOUT_MS = 60_000;
const MAX_OUT = 200_000;
const MAX_ROWS = 2_000;

const str = (d) => ({ type: "string", description: d });
const TOOLS = [
  {
    name: "analyzeit_status",
    description: "Show AnalyzeIt's state on this device: datasets, connectors, pending outbox. Call first to check the CLI works.",
    inputSchema: { type: "object", properties: {} },
    argv: () => ["status"],
  },
  {
    name: "list_datasets",
    description: "List datasets in the encrypted local vault (id, name, rows, columns, retention, sharing).",
    inputSchema: { type: "object", properties: {} },
    argv: () => ["data", "list"],
  },
  {
    name: "profile_dataset",
    description: "Schema (column names and types), quality notes and a numeric/categorical summary for one dataset. Always do this before writing SQL so column names are real.",
    inputSchema: { type: "object", properties: { dataset: str("Dataset name or id prefix") }, required: ["dataset"] },
    argv: (a) => ["data", "show", ds(a.dataset)],
  },
  {
    name: "run_sql",
    description: "Run one read-only SQL SELECT over the vault; each dataset is a table named after it. Returns CSV. Use for any exact number, filter, join or aggregation.",
    inputSchema: { type: "object", properties: { sql: str("A single SELECT statement"), limit: { type: "integer", description: `Max rows returned to you (default 200, max ${MAX_ROWS})` } }, required: ["sql"] },
    argv: (a) => ["sql", a.sql, "--csv"],
    post: (out, a) => clipRows(out, Math.min(Math.max(a.limit || 200, 1), MAX_ROWS)),
  },
  {
    name: "analyze",
    description:
      "Run one of AnalyzeIt's deterministic built-in analyses from a plain-English request: top N, aggregate, trend, correlations, outliers, drivers, segment comparison, forecast, profile. Numbers come from computation, not a model. Refuses with a clear message when the request is not a built-in analysis: then use run_sql. Only works on datasets that are private (not allowed to send a summary), so nothing leaves the device.",
    inputSchema: { type: "object", properties: { dataset: str("Dataset name or id prefix"), request: str("e.g. 'top 5 region by revenue', 'monthly revenue trend', 'outliers in amount', 'what drives revenue', 'forecast revenue 3 months'") }, required: ["dataset", "request"] },
    guard: privateOnly,
    argv: (a) => ["ask", "-d", ds(a.dataset), a.request],
  },
  {
    name: "import_data",
    description: "Import a local file (csv, tsv, json, jsonl, xlsx, xls, ods) into the encrypted vault as a dataset. Changes local state.",
    inputSchema: { type: "object", properties: { path: str("Absolute path to the file"), name: str("Dataset name (optional)"), retain_days: { type: "integer", description: "Auto-delete after N days (optional)" } }, required: ["path"] },
    argv: (a) => ["data", "import", a.path, ...(a.name ? ["--name", a.name] : []), ...(a.retain_days ? ["--retain", String(a.retain_days)] : [])],
  },
  {
    name: "pin_widget",
    description: "Pin an analysis (built-in request or SQL) to a local dashboard so it stays live. Changes local state.",
    inputSchema: { type: "object", properties: { dataset: str("Dataset name or id prefix"), request: str("Built-in analysis request (omit if using sql)"), sql: str("SELECT to pin (omit if using request)"), dashboard: str("Dashboard name, default 'main'") }, required: ["dataset"] },
    guard: (a) => (a.sql ? null : privateOnly(a)),
    argv: (a) => ["pin", ds(a.dataset), ...(a.sql ? ["--sql", a.sql] : [a.request || ""]), ...(a.dashboard ? ["--dashboard", a.dashboard] : [])],
  },
  {
    name: "show_dashboard",
    description: "List local dashboards, or show one (optionally recomputing its widgets from current data).",
    inputSchema: { type: "object", properties: { name: str("Dashboard name (omit to list)"), refresh: { type: "boolean" } } },
    argv: (a) => ["board", ...(a.name ? [a.name] : []), ...(a.refresh ? ["--refresh"] : [])],
  },
];

function ds(v) {
  if (typeof v !== "string" || !v.trim() || v.startsWith("-")) throw new Error("dataset must be a dataset name or id");
  return v;
}

function run(argv) {
  return new Promise((resolve) => {
    execFile(BIN, argv, { timeout: TIMEOUT_MS, maxBuffer: 8 * 1024 * 1024, env: process.env }, (err, stdout, stderr) => {
      if (err && err.code === "ENOENT") {
        return resolve({ ok: false, text: `Cannot find the \`${BIN}\` CLI. Install it (curl -fsSL https://www.analyzeit.in/install.sh | sh) or set ANALYZEIT_BIN to its path.` });
      }
      const out = [stdout, stderr].filter(Boolean).join(stdout && stderr ? "\n" : "").trim();
      resolve({ ok: !err, text: err && !out ? String(err.message) : out });
    });
  });
}

// Open-ended phrasing falls through to AnalyzeIt's hosted LLM when a dataset allows
// sharing its summary. This plugin replaces that LLM, so only private datasets are allowed.
async function privateOnly(a) {
  const r = await run(["data", "list"]);
  if (!r.ok) return null; // the command itself will report the real error
  const key = String(a.dataset).toLowerCase();
  const row = r.text.split("\n").find((l) => l.toLowerCase().includes(key));
  if (row && /\bsummary\b/.test(row)) {
    return `"${a.dataset}" allows its summary to be sent to AnalyzeIt's service, and this tool could forward an unrecognised request there. Use run_sql here, or have the user run \`analyzeit data share ${a.dataset} off\`.`;
  }
  return null;
}

function clipRows(csv, max) {
  const lines = csv.split("\n");
  if (lines.length - 1 <= max) return csv;
  return `${lines.slice(0, max + 1).join("\n")}\n[truncated: showing ${max} of ${lines.length - 1} rows; aggregate in SQL instead]`;
}

async function callTool(name, args = {}) {
  const t = TOOLS.find((x) => x.name === name);
  if (!t) return { isError: true, content: [{ type: "text", text: `Unknown tool ${name}` }] };
  try {
    const blocked = t.guard ? await t.guard(args) : null;
    if (blocked) return { isError: true, content: [{ type: "text", text: blocked }] };
    const r = await run(t.argv(args));
    let text = r.ok && t.post ? t.post(r.text, args) : r.text;
    if (text.length > MAX_OUT) text = `${text.slice(0, MAX_OUT)}\n[output truncated]`;
    return { isError: !r.ok, content: [{ type: "text", text: text || "(no output)" }] };
  } catch (e) {
    return { isError: true, content: [{ type: "text", text: String(e.message || e) }] };
  }
}

const send = (m) => process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", ...m })}\n`);

async function handle(msg) {
  const { id, method, params } = msg;
  if (method === "initialize") {
    return send({ id, result: { protocolVersion: params?.protocolVersion || "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "analyzeit", version: "0.1.0" } } });
  }
  if (method === "tools/list") {
    return send({ id, result: { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) } });
  }
  if (method === "tools/call") {
    return send({ id, result: await callTool(params?.name, params?.arguments) });
  }
  if (method === "ping") return send({ id, result: {} });
  if (id !== undefined) send({ id, error: { code: -32601, message: `Method not found: ${method}` } });
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  createInterface({ input: process.stdin }).on("line", (line) => {
    if (!line.trim()) return;
    let msg;
    try { msg = JSON.parse(line); } catch { return send({ id: null, error: { code: -32700, message: "Parse error" } }); }
    handle(msg).catch((e) => msg.id !== undefined && send({ id: msg.id, error: { code: -32603, message: String(e.message || e) } }));
  });
}

export { TOOLS, callTool, clipRows };
