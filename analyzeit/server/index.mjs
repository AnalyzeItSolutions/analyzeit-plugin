#!/usr/bin/env node
// AnalyzeIt MCP server (stdio, no dependencies).
// Signs the user in through the AnalyzeIt website and reads their projects, objects and records through
// the website's API. It does not call AnalyzeIt's hosted assistant: the connected assistant does the reasoning.
import { createInterface } from "node:readline";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { api, NotSignedIn } from "./api.mjs";
import { loadConfig } from "./config.mjs";
import { exchange, openBrowser, startLogin } from "./login.mjs";
import { clearToken, loadToken, saveToken } from "./session.mjs";

const MAX_OUT = 100_000;
const str = (d) => ({ type: "string", description: d });
const filtersSchema = {
  type: "array",
  description: "Filters, all must match. Operators are those of the AnalyzeIt records API (eq, neq, gt, gte, lt, lte, contains, ...).",
  items: { type: "object", properties: { field: str("Field api_name"), operator: str("e.g. eq"), value: {} }, required: ["field"] },
};
const PAGES = { dashboard: "/dashboard", new_project: "/new-project", connectors: "/connectors", project: "/project/" };

const TOOLS = [
  {
    name: "login",
    description: "Sign in to AnalyzeIt. Opens the AnalyzeIt website in the user's browser; they sign in there and click Allow. Waits up to 5 minutes. Call this when other tools say the user is not signed in.",
    inputSchema: { type: "object", properties: {} },
    run: async (cfg) => {
      const { url, result } = await startLogin(cfg);
      const opened = openBrowser(url);
      const pending = result.then((r) => exchange(cfg, r));
      const { token, email } = await pending.catch((e) => { throw new Error(`${e.message}${opened ? "" : ` If no browser opened, visit: ${url}`}`); });
      saveToken(cfg, token, email);
      return { signed_in_as: email, note: "Session stored for this plugin only. Use `logout` to remove it." };
    },
  },
  {
    name: "whoami",
    description: "Show who is signed in (or that nobody is).",
    inputSchema: { type: "object", properties: {} },
    run: async (cfg) => {
      if (!loadToken(cfg)) return { signed_in: false };
      const me = await api.me(cfg);
      return { signed_in: true, email: me.email, name: me.name, tier: me.tier ?? me.plan };
    },
  },
  {
    name: "logout",
    description: "Forget the stored AnalyzeIt session on this computer.",
    inputSchema: { type: "object", properties: {} },
    run: async (cfg) => { clearToken(cfg); return { signed_in: false }; },
  },
  {
    name: "list_projects",
    description: "List the user's AnalyzeIt projects (id, name).",
    inputSchema: { type: "object", properties: {} },
    run: async (cfg) => (await api.projects(cfg)).map((p) => ({ id: p.id, name: p.name, widgets: p.widget_count })),
  },
  {
    name: "list_objects",
    description: "List the data objects (tables) in a project with their fields and types. Call before querying so field names are real.",
    inputSchema: { type: "object", properties: { project_id: str("Project id") }, required: ["project_id"] },
    run: async (cfg, a) => (await api.objects(cfg, a.project_id)).map((o) => ({
      id: o.id, api_name: o.api_name, label: o.label, source: o.source,
      fields: (o.fields || []).map((f) => ({ api_name: f.api_name, type: f.type })),
    })),
  },
  {
    name: "list_datasets",
    description: "List files the user uploaded to a project (each becomes an object).",
    inputSchema: { type: "object", properties: { project_id: str("Project id") }, required: ["project_id"] },
    run: (cfg, a) => api.datasets(cfg, a.project_id),
  },
  {
    name: "query_records",
    description: "Fetch rows from an object, with optional filters, search and sorting. Max 200 rows per call; page with skip. For totals, averages or groupings use `aggregate` instead of reading rows.",
    inputSchema: {
      type: "object",
      properties: {
        object: str("Object id or api_name"), filters: filtersSchema, search: str("Free-text search"),
        limit: { type: "integer", description: "1-200, default 50" }, skip: { type: "integer" },
        sort_by: str("Field api_name, default created_at"), sort_desc: { type: "boolean" },
      },
      required: ["object"],
    },
    run: async (cfg, a) => {
      const r = await api.query(cfg, a.object, {
        filters: a.filters || [], search: a.search ?? null, limit: Math.min(Math.max(a.limit || 50, 1), 200), skip: a.skip || 0,
        sort_by: a.sort_by || "created_at", sort_desc: a.sort_desc ?? true,
      });
      return { total: r.total, returned: r.records.length, has_more: r.has_more, rows: r.records.map((x) => ({ id: x.id, ...(x.data || {}) })) };
    },
  },
  {
    name: "aggregate",
    description: "Server-computed group-and-aggregate over an object: count, sum, avg, min or max of a numeric field, optionally grouped by a field (dates can be bucketed by month). Exact numbers, no model involved. Reports how many records were used and whether it was truncated.",
    inputSchema: {
      type: "object",
      properties: {
        object: str("Object id or api_name"), metric: { type: "string", enum: ["count", "sum", "avg", "min", "max"] },
        field: str("Numeric field (required unless metric is count)"), group_by: str("Field to group by (omit for one number)"),
        bucket: { type: "string", enum: ["month"] }, filters: filtersSchema, limit: { type: "integer", description: "1-50 groups, default 12" },
        sort: { type: "string", enum: ["label_asc"] },
      },
      required: ["object"],
    },
    run: (cfg, a) => api.aggregate(cfg, a.object, {
      metric: a.metric || "count", field: a.field ?? null, group_by: a.group_by ?? null, bucket: a.bucket ?? null,
      filters: a.filters || [], limit: Math.min(Math.max(a.limit || 12, 1), 50), sort: a.sort ?? null,
    }),
  },
  {
    name: "open_in_website",
    description: "Open a page of the AnalyzeIt website in the user's browser, for things the user does there: uploading data (open the project and attach the file in its chat), connecting a source (`connectors`), creating a project, or viewing dashboards. Tell the user what to do on the page.",
    inputSchema: { type: "object", properties: { page: { type: "string", enum: Object.keys(PAGES) }, project_id: str("Needed for page=project") }, required: ["page"] },
    run: async (cfg, a) => {
      let path = PAGES[a.page];
      if (!path) throw new Error("Unknown page");
      if (a.page === "project") {
        if (!a.project_id || !/^[\w.-]{1,128}$/.test(a.project_id)) throw new Error("page=project needs project_id");
        path += encodeURIComponent(a.project_id);
      }
      const url = `${cfg.site}${path}`;
      return { url, opened: openBrowser(url) };
    },
  },
];

async function callTool(cfg, name, args = {}) {
  const t = TOOLS.find((x) => x.name === name);
  if (!t) return { isError: true, content: [{ type: "text", text: `Unknown tool ${name}` }] };
  try {
    const out = await t.run(cfg, args || {});
    let text = JSON.stringify(out, null, 1);
    if (text.length > MAX_OUT) text = `${text.slice(0, MAX_OUT)}\n[output truncated: narrow the filters or use aggregate]`;
    return { content: [{ type: "text", text }] };
  } catch (e) {
    return { isError: true, content: [{ type: "text", text: e instanceof NotSignedIn ? e.message : String(e.message || e) }] };
  }
}

const send = (m) => process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", ...m })}\n`);

async function handle(cfg, msg) {
  const { id, method, params } = msg;
  if (method === "initialize") return send({ id, result: { protocolVersion: params?.protocolVersion || "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "analyzeit", version: "0.2.0" } } });
  if (method === "tools/list") return send({ id, result: { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) } });
  if (method === "tools/call") return send({ id, result: await callTool(cfg, params?.name, params?.arguments) });
  if (method === "ping") return send({ id, result: {} });
  if (id !== undefined) send({ id, error: { code: -32601, message: `Method not found: ${method}` } });
}

const isMain = process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  let cfg;
  try { cfg = loadConfig(); } catch (e) { process.stderr.write(`${e.message}\n`); process.exit(1); }
  createInterface({ input: process.stdin }).on("line", (line) => {
    if (!line.trim()) return;
    let msg;
    try { msg = JSON.parse(line); } catch { return send({ id: null, error: { code: -32700, message: "Parse error" } }); }
    handle(cfg, msg).catch((e) => msg.id !== undefined && send({ id: msg.id, error: { code: -32603, message: String(e.message || e) } }));
  });
}

export { TOOLS, callTool };
