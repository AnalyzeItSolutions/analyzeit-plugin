// Run: node --test test/
import test from "node:test";
import assert from "node:assert/strict";
import { createServer, request } from "node:http";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHttpServer } from "../server/index.mjs";
import { runAgent, analystPrompt } from "../server/agent.mjs";
import { resolveProvider } from "../server/providers.mjs";
import { normalizeFilters } from "../server/tools.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const listen = (srv) => new Promise((r) => srv.listen(0, "127.0.0.1", () => r(srv.address().port)));
const json = (res, code, obj) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); };
const readBody = (req) => new Promise((r) => { let b = ""; req.on("data", (d) => (b += d)); req.on("end", () => r(b)); });

// Stand-in for the AnalyzeIt API; records what the query endpoint received.
const received = [];
const analyzeit = createServer(async (req, res) => {
  const body = await readBody(req);
  if (req.headers.authorization !== "Bearer tok") return json(res, 401, { detail: "no" });
  if (req.url === "/v1/projects") return json(res, 200, [{ id: "p1", name: "Shop", widget_count: 1 }]);
  if (req.url === "/v1/objects/orders/records/query") { received.push(JSON.parse(body)); return json(res, 200, { total: 1, has_more: false, records: [{ id: "r1", data: { amount: 5 } }] }); }
  json(res, 404, {});
});
const apiPort = await listen(analyzeit);
const cfg = { api: `http://127.0.0.1:${apiPort}`, site: "http://127.0.0.1:1", token: "tok", dir: "/nonexistent" };

function http(port, { method = "POST", path = "/mcp", headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const r = request({ host: "127.0.0.1", port, path, method, headers: { "content-type": "application/json", ...headers } }, (res) => {
      let b = ""; res.on("data", (d) => (b += d)); res.on("end", () => resolve({ status: res.statusCode, body: b ? JSON.parse(b) : null }));
    });
    r.on("error", reject);
    if (body !== undefined) r.write(JSON.stringify(body));
    r.end();
  });
}

test("HTTP transport: initialize, list and call tools", async () => {
  const srv = createHttpServer(cfg, { token: "" });
  const port = await listen(srv);
  const init = await http(port, { body: { jsonrpc: "2.0", id: 1, method: "initialize", params: {} } });
  assert.equal(init.body.result.serverInfo.name, "analyzeit");
  assert.equal((await http(port, { body: { jsonrpc: "2.0", method: "notifications/initialized" } })).status, 202);
  const list = await http(port, { body: { jsonrpc: "2.0", id: 2, method: "tools/list" } });
  assert.ok(list.body.result.tools.some((t) => t.name === "aggregate"));
  const call = await http(port, { body: { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "list_projects", arguments: {} } } });
  assert.match(call.body.result.content[0].text, /Shop/);
  const batch = await http(port, { body: [{ jsonrpc: "2.0", id: 4, method: "ping" }, { jsonrpc: "2.0", id: 5, method: "nope" }] });
  assert.equal(batch.body.length, 2);
  assert.equal((await http(port, { method: "GET" })).status, 405);
  srv.close();
});

test("HTTP transport refuses foreign hosts, foreign origins and a missing token", async () => {
  const srv = createHttpServer(cfg, { token: "s3cret" });
  const port = await listen(srv);
  const body = { jsonrpc: "2.0", id: 1, method: "ping" };
  const auth = { authorization: "Bearer s3cret" };
  assert.equal((await http(port, { body, headers: auth })).status, 200);
  assert.equal((await http(port, { body })).status, 401);
  assert.equal((await http(port, { body, headers: { authorization: "Bearer wrong!" } })).status, 401);
  assert.equal((await http(port, { body, headers: { ...auth, host: "evil.example" } })).status, 403);
  assert.equal((await http(port, { body, headers: { ...auth, origin: "https://evil.example" } })).status, 403);
  assert.equal((await http(port, { body, headers: { ...auth, origin: "http://localhost:3000" } })).status, 200);
  srv.close();
});

test("filters: value_type converts, bad numbers are rejected, `in` splits", () => {
  assert.deepEqual(normalizeFilters([{ field: "amount", operator: "gt", value: "10", value_type: "number" }]), [{ field: "amount", operator: "gt", value: 10 }]);
  assert.deepEqual(normalizeFilters([{ field: "paid", value: "TRUE", value_type: "boolean" }]), [{ field: "paid", operator: "eq", value: true }]);
  assert.deepEqual(normalizeFilters([{ field: "r", operator: "in", value: "N, S" }]), [{ field: "r", operator: "in", value: ["N", "S"] }]);
  assert.throws(() => normalizeFilters([{ field: "a", value: "abc", value_type: "number" }]));
});

test("provider presets and validation", () => {
  const env = { OPENAI_API_KEY: "k", XAI_API_KEY: "x", ANTHROPIC_API_KEY: "a" };
  assert.equal(resolveProvider("xai", env, { model: "m" }).base, "https://api.x.ai/v1");
  assert.equal(resolveProvider("grok", env, { model: "m" }).key, "x");
  assert.equal(resolveProvider("claude", env, { model: "m" }).wire, "anthropic");
  assert.equal(resolveProvider("ollama", {}, { model: "m" }).key, "");
  assert.throws(() => resolveProvider("openai", {}, { model: "m" }), /OPENAI_API_KEY/);
  assert.throws(() => resolveProvider("openai", env, {}), /model/);
  assert.throws(() => resolveProvider("nope", env, { model: "m" }), /Unknown provider/);
  assert.throws(() => resolveProvider("custom", env, { model: "m", base: "http://evil.example" }), /https/);
  assert.throws(() => resolveProvider("custom", env, { model: "m", base: "https://u:p@x.example" }), /credentials/);
  assert.equal(resolveProvider("custom", { ANALYZEIT_LLM_API_KEY: "k" }, { model: "m", base: "http://localhost:8080/v1/" }).base, "http://localhost:8080/v1");
});

test("agent runner, OpenAI wire format (OpenAI, Grok, Gemini, Groq, Ollama ...)", async () => {
  const seen = [];
  const llm = createServer(async (req, res) => {
    const b = JSON.parse(await readBody(req));
    seen.push({ auth: req.headers.authorization, b });
    const toolResult = b.messages.find((m) => m.role === "tool");
    if (!toolResult) {
      return json(res, 200, { choices: [{ message: { content: null, tool_calls: [{ id: "c1", type: "function", function: { name: "query_records", arguments: JSON.stringify({ object: "orders", filters: [{ field: "amount", operator: "gt", value: "1", value_type: "number" }] }) } }] } }] });
    }
    json(res, 200, { choices: [{ message: { content: `Found: ${toolResult.content.includes('"amount": 5') ? "amount 5" : "?"}` } }] });
  });
  const port = await listen(llm);
  received.length = 0;
  const out = await runAgent({ question: "orders over 1?", provider: { wire: "openai", base: `http://127.0.0.1:${port}`, key: "K", model: "m" }, cfg });
  assert.equal(out, "Found: amount 5");
  assert.equal(seen[0].auth, "Bearer K");
  assert.equal(seen[0].b.tools.length, 9);
  assert.match(seen[0].b.messages[0].content, /analyst inside AnalyzeIt/);
  assert.deepEqual(received[0].filters, [{ field: "amount", operator: "gt", value: 1 }], "the number reached the API as a number");
  llm.close();
});

test("agent runner, Anthropic wire format", async () => {
  const seen = [];
  const llm = createServer(async (req, res) => {
    const b = JSON.parse(await readBody(req));
    seen.push({ key: req.headers["x-api-key"], ver: req.headers["anthropic-version"], b });
    const last = b.messages[b.messages.length - 1];
    if (last.role === "user" && typeof last.content === "string") {
      return json(res, 200, { content: [{ type: "text", text: "Checking." }, { type: "tool_use", id: "t1", name: "list_projects", input: {} }] });
    }
    json(res, 200, { content: [{ type: "text", text: `You have: ${last.content[0].content.includes("Shop") ? "Shop" : "?"}` }] });
  });
  const port = await listen(llm);
  const out = await runAgent({ question: "what projects?", provider: { wire: "anthropic", base: `http://127.0.0.1:${port}`, key: "AK", model: "m" }, cfg });
  assert.equal(out, "You have: Shop");
  assert.equal(seen[0].key, "AK");
  assert.ok(seen[0].b.tools[0].input_schema);
  assert.equal(seen[1].b.messages[2].content[0].type, "tool_result");
  llm.close();
});

test("agent runner stops at the step limit and reports tool errors to the model", async () => {
  let n = 0;
  const llm = createServer(async (req, res) => {
    const b = JSON.parse(await readBody(req));
    n++;
    const last = b.messages[b.messages.length - 1];
    if (n === 2) assert.match(last.content, /^Error: /, "bad input comes back as an error the model can fix");
    json(res, 200, { choices: [{ message: { content: null, tool_calls: [{ id: `c${n}`, type: "function", function: { name: "list_objects", arguments: JSON.stringify({ project_id: "../x" }) } }] } }] });
  });
  const port = await listen(llm);
  const out = await runAgent({ question: "loop", provider: { wire: "openai", base: `http://127.0.0.1:${port}`, key: "", model: "m" }, cfg, maxSteps: 3 });
  assert.match(out, /step limit/);
  assert.equal(n, 3);
  llm.close();
});

test("analyst prompt is the sub-agent file without frontmatter", () => {
  const p = analystPrompt();
  assert.ok(!p.startsWith("---") && p.includes("## Rules"));
});

test("exported tool definitions are in sync with the code", () => {
  execFileSync(process.execPath, [join(root, "server/export-tools.mjs"), "--check"]);
});

test.after(() => analyzeit.close());
