// Drives the server over stdio against a fake `analyzeit` CLI. Run: node test/smoke.mjs
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const dir = mkdtempSync(join(tmpdir(), "az-"));
const fake = join(dir, "analyzeit");
writeFileSync(fake, `#!/bin/sh
echo "$@" >> "${dir}/calls.log"
case "$1" in
  data) if [ "$2" = list ]; then
      echo "id name rows cols retention sharing updated"
      echo "aaaa1111 sales 10 3 kept private 1m ago"
      echo "bbbb2222 shared_ds 10 3 kept summary 1m ago"
    else echo "ok $@"; fi ;;
  sql) echo "a,b"; i=0; while [ $i -lt 5 ]; do echo "$i,x"; i=$((i+1)); done ;;
  *) echo "ran $@" ;;
esac
`);
chmodSync(fake, 0o755);

const p = spawn("node", [join(dirname(fileURLToPath(import.meta.url)), "../server/index.mjs")], { env: { ...process.env, ANALYZEIT_BIN: fake } });
let buf = ""; const waiters = new Map();
p.stdout.on("data", (d) => { buf += d; let i; while ((i = buf.indexOf("\n")) >= 0) { const m = JSON.parse(buf.slice(0, i)); buf = buf.slice(i + 1); waiters.get(m.id)?.(m); } });
let n = 0;
const rpc = (method, params) => new Promise((res) => { const id = ++n; waiters.set(id, res); p.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n"); });
const text = (r) => r.result.content[0].text;

assert.equal((await rpc("initialize", {})).result.serverInfo.name, "analyzeit");
const tools = (await rpc("tools/list")).result.tools.map((t) => t.name);
assert.equal(tools.length, 8);
assert.ok(!tools.some((t) => /ask|upload|service/.test(t)), "no tool may reach the hosted LLM");

assert.match(text(await rpc("tools/call", { name: "list_datasets", arguments: {} })), /sales/);
assert.match(text(await rpc("tools/call", { name: "run_sql", arguments: { sql: "select 1", limit: 2 } })), /truncated: showing 2 of 5/);
assert.match(text(await rpc("tools/call", { name: "analyze", arguments: { dataset: "sales", request: "top 5 region" } })), /ran ask -d sales top 5 region/);

const blocked = await rpc("tools/call", { name: "analyze", arguments: { dataset: "shared_ds", request: "anything" } });
assert.equal(blocked.result.isError, true);
assert.match(text(blocked), /allows its summary/);

const bad = await rpc("tools/call", { name: "profile_dataset", arguments: { dataset: "--evil" } });
assert.equal(bad.result.isError, true);

console.log("smoke ok");
p.kill();
