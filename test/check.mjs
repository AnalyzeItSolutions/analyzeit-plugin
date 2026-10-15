// Run: node test/check.mjs. Validates the manifests and scans the package for anything that looks like a secret.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const json = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));

const plugin = json("analyzeit/.claude-plugin/plugin.json");
assert.equal(plugin.name, "analyzeit");
assert.match(plugin.version, /^\d+\.\d+\.\d+$/);
const market = json(".claude-plugin/marketplace.json");
assert.equal(market.plugins[0].source, "./analyzeit");

const server = json("analyzeit/.mcp.json").mcpServers.analyzeit;
assert.equal(server.command, "analyzeit", "the plugin runs the CLI by name");
assert.deepEqual(server.args, ["mcp"]);
assert.equal(Object.keys(server).sort().join(), "args,command", "no url, tokens, env or headers in the config");

const agent = readFileSync(join(root, "analyzeit/agents/analyzeit-analyst.md"), "utf8");
assert.match(agent, /^tools: mcp__plugin_analyzeit_analyzeit__\*$/m, "the sub-agent is limited to the AnalyzeIt tools");
for (const f of ["analyzeit/skills/analyzeit/SKILL.md", "analyzeit/agents/analyzeit-analyst.md", "analyzeit/commands/analyze.md", "README.md"]) {
  const t = readFileSync(join(root, f), "utf8");
  assert.ok(!/backend-qwiq|onrender\.com|Authenticate/.test(t), `${f} still refers to the hosted connector`);
}
const tools = [...agent.matchAll(/`(list_datasets|analyze|privacy_policy)`/g)].map((m) => m[1]);
assert.ok(tools.length >= 3, "the analyst names the CLI's tools");
assert.ok(!/query_records|aggregate|propose_import/.test(agent), "the analyst names no hosted-connector tools");

// Nothing that looks like a secret or a local path, anywhere in the package.
const patterns = [/sk-[A-Za-z0-9]{20,}/, /AKIA[0-9A-Z]{16}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /Bearer [A-Za-z0-9._-]{20,}/, /aza[crt]_[A-Za-z0-9_-]{20,}/, /mongodb(\+srv)?:\/\//, /\/Users\/[a-z]/i, /[\w.+-]+@(gmail|outlook|yahoo)\.com/i];
function* walk(dir) {
  for (const n of readdirSync(dir)) {
    if (n === ".git" || n === "node_modules") continue;
    const p = join(dir, n);
    statSync(p).isDirectory() ? yield* walk(p) : yield p;
  }
}
for (const f of walk(root)) {
  if (f.endsWith("check.mjs")) continue;
  const text = readFileSync(f, "utf8");
  for (const re of patterns) assert.ok(!re.test(text), `${relative(root, f)} matches ${re}`);
}
console.log("ok");
