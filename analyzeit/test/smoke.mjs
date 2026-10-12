// Runs the server against a local stand-in for the AnalyzeIt website API. Run: node test/smoke.mjs
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, statSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

const TOKEN = "test-token";
const seen = [];
let pkce = null;

const fake = createServer((req, res) => {
  let body = "";
  req.on("data", (d) => (body += d));
  req.on("end", () => {
    const send = (code, obj) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); };
    seen.push(`${req.method} ${req.url}`);
    if (req.url === "/__browser") { // the fake browser reports the sign-in URL it was asked to open
      const u = new URL(JSON.parse(body).url);
      if (u.pathname === "/native-login") pkce = u.searchParams.get("challenge");
      return send(200, { ok: true });
    }
    if (req.url === "/v1/auth/native/token") {
      const { code, verifier } = JSON.parse(body);
      const ok = code === "code123" && createHash("sha256").update(verifier).digest("base64url") === pkce;
      return ok ? send(200, { token: TOKEN, user: { email: "a@example.test" } }) : send(400, { detail: "invalid" });
    }
    if (req.headers.authorization !== `Bearer ${TOKEN}`) return send(401, { detail: "no" });
    if (req.url === "/v1/auth/me") return send(200, { email: "a@example.test", name: "A" });
    if (req.url === "/v1/projects") return send(200, [{ id: "p1", name: "Shop", widget_count: 3 }]);
    if (req.url === "/v1/projects/p1/objects") return send(200, [{ id: "o1", api_name: "orders", label: "Orders", fields: [{ api_name: "amount", type: "number" }] }]);
    if (req.url === "/v1/objects/orders/records/query") return send(200, { total: 1, has_more: false, records: [{ id: "r1", data: { amount: 5 } }] });
    if (req.url === "/v1/objects/orders/aggregate") return send(200, { rows: [{ label: "all", value: 5 }], records_used: 1, records_total: 1, truncated: false });
    send(404, { detail: "nf" });
  });
});
await new Promise((r) => fake.listen(0, "127.0.0.1", r));
const api = `http://127.0.0.1:${fake.address().port}`;
const home = mkdtempSync(join(tmpdir(), "azp-"));

// A fake browser: reports the URL to the fake API, and if it is the sign-in page, "clicks Allow" by
// following the loopback redirect with the one-time code, as the real website would.
const bin = mkdtempSync(join(tmpdir(), "azb-"));
const opener = `#!${process.execPath}
const url = new URL(process.argv[process.argv.length - 1]);
await fetch("${api}/__browser", { method: "POST", body: JSON.stringify({ url: url.href }) });
if (url.pathname === "/native-login") {
  await fetch(\`http://127.0.0.1:\${url.searchParams.get("port")}/callback?code=code123&state=\${url.searchParams.get("state")}\`);
}
`;
for (const name of ["open", "xdg-open", "rundll32"]) { writeFileSync(join(bin, name), opener); chmodSync(join(bin, name), 0o755); }

const p = spawn(process.execPath, [join(dirname(fileURLToPath(import.meta.url)), "../server/index.mjs")], {
  env: { ...process.env, ANALYZEIT_API_URL: api, ANALYZEIT_SITE_URL: "http://127.0.0.1:1", ANALYZEIT_PLUGIN_HOME: home, ANALYZEIT_TOKEN: "", PATH: bin },
});
let buf = ""; const waiters = new Map();
p.stdout.on("data", (d) => { buf += d; let i; while ((i = buf.indexOf("\n")) >= 0) { const m = JSON.parse(buf.slice(0, i)); buf = buf.slice(i + 1); waiters.get(m.id)?.(m); } });
let n = 0;
const rpc = (method, params) => new Promise((res) => { const id = ++n; waiters.set(id, res); p.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n"); });
const call = (name, args = {}) => rpc("tools/call", { name, arguments: args });
const text = (r) => r.result.content[0].text;

const names = (await rpc("tools/list")).result.tools.map((t) => t.name);
assert.deepEqual(names, ["login", "whoami", "logout", "list_projects", "list_objects", "list_datasets", "query_records", "aggregate", "open_in_website"]);
assert.ok(!names.some((t) => /chat|ask|upload|delete|write|update|create/.test(t)), "read-only: no write tools and no hosted-assistant tool");

// Not signed in: tools refuse and point at login; nothing reaches the API.
let r = await call("list_projects");
assert.equal(r.result.isError, true);
assert.match(text(r), /login/);
assert.equal(seen.length, 0);

// Login through the "website" and the PKCE exchange.
r = await call("login");
assert.notEqual(r.result.isError, true, text(r));
assert.match(text(r), /a@example\.test/);
const sess = join(home, "session.json");
assert.ok(existsSync(sess));
assert.equal(statSync(sess).mode & 0o777, 0o600, "session file must be owner-only");
assert.ok(!readFileSync(sess, "utf8").includes("password"));

assert.match(text(await call("whoami")), /"signed_in": true/);
assert.match(text(await call("list_projects")), /Shop/);
assert.match(text(await call("list_objects", { project_id: "p1" })), /amount/);
const q = JSON.parse(text(await call("query_records", { object: "orders", limit: 9999 })));
assert.deepEqual(q.rows, [{ id: "r1", amount: 5 }]);
assert.match(text(await call("aggregate", { object: "orders", metric: "sum", field: "amount" })), /records_used/);

// Ids are validated before they are put in a URL.
r = await call("list_objects", { project_id: "../../admin" });
assert.equal(r.result.isError, true);

// Opening website pages for things the user does there.
r = await call("open_in_website", { page: "project", project_id: "p1" });
assert.match(text(r), /"opened": true/);
assert.equal((await call("open_in_website", { page: "project" })).result.isError, true);
assert.equal((await call("open_in_website", { page: "https://evil.example" })).result.isError, true);

// Logout removes the session; tools refuse again.
await call("logout");
assert.ok(!existsSync(sess));
assert.equal((await call("list_projects")).result.isError, true);

console.log("smoke ok");
p.kill();
fake.close();
