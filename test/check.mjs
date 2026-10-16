// Run: node test/check.mjs. Validates the manifests and scans the package for anything that looks like a secret.
import { existsSync, readFileSync, readdirSync, statSync, mkdtempSync, writeFileSync, chmodSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
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
assert.equal(server.command, "${CLAUDE_PLUGIN_ROOT}/scripts/analyzeit-mcp.sh", "the plugin starts its own launcher script");
assert.equal(Object.keys(server).join(), "command", "no url, tokens, env, args or headers in the config");

// The launcher: executable, plain shell, version-gated, ends by exec'ing `analyzeit mcp`.
const script = join(root, "analyzeit/scripts/analyzeit-mcp.sh");
assert.ok(statSync(script).mode & 0o111, "launcher is executable");
const sh = readFileSync(script, "utf8");
assert.match(sh, /^#!\/bin\/sh/);
assert.match(sh, /exec "\$bin" mcp$/m);
assert.ok(!/\b(npx|uvx|pipx|curl|wget)\b(?! -fsSL https:\/\/www\.analyzeit\.si\/install\.sh)/.test(sh), "launcher downloads and installs nothing");
const gate = (v) => spawnSync("sh", [script], { env: { PATH: "/usr/bin:/bin", HOME: "/nonexistent", ANALYZEIT_BIN: fake(v) }, encoding: "utf8" });
const tmp = mkdtempSync(join(tmpdir(), "azplug-"));
function fake(v) {
  const f = join(tmp, `analyzeit-${v}`);
  writeFileSync(f, `#!/bin/sh\n[ "$1" = --version ] && echo "analyzeit ${v}" && exit 0\necho "served:$*"\n`);
  chmodSync(f, 0o755);
  return f;
}
const min = /^MIN="([\d.]+)"/m.exec(sh)[1];
assert.equal(gate(min).stdout.trim(), "served:mcp", "the minimum version is served");
assert.equal(gate("0.10.0").stdout.trim(), "served:mcp", "versions compare numerically");
const old = gate("0.5.0");
assert.equal(old.status, 1, "an old command is refused");
assert.ok(!old.stdout.includes("served"), "an old command is never started (it would treat `mcp` as a question)");
assert.match(old.stderr, /analyzeit update/);
const none = spawnSync("sh", [script], { env: { PATH: "/usr/bin:/bin", HOME: "/nonexistent" }, encoding: "utf8" });
assert.equal(none.status, 1);
const fallbackExists = ["/usr/local/bin/analyzeit", "/opt/homebrew/bin/analyzeit"].some((p) => existsSync(p));
if (!fallbackExists) assert.match(none.stderr, /not installed/); // else this machine has a real install in a fallback folder
rmSync(tmp, { recursive: true, force: true });

// Marketplace/directory requirements (the portal's own checks run on top of `claude plugin validate`).
for (const k of ["displayName", "description", "author", "homepage", "repository", "license", "icon", "documentationUrl", "supportUrl", "privacyPolicyUrl", "termsOfServiceUrl"]) assert.ok(plugin[k], `plugin.json needs ${k}`);
for (const k of ["homepage", "documentationUrl", "supportUrl", "privacyPolicyUrl", "termsOfServiceUrl"]) assert.match(plugin[k], /^https:\/\//, `${k} is https`);
assert.ok(market.description, "marketplace has a description");
assert.equal(plugin.name, market.plugins[0].name, "entry and manifest names match");
const png = readFileSync(join(root, "analyzeit", plugin.icon));
assert.equal(png.subarray(1, 4).toString(), "PNG", "icon is a PNG");
const words = readFileSync(join(root, "analyzeit/README.md"), "utf8").replace(/```[\s\S]*?```/g, "").split(/\s+/).filter(Boolean).length;
assert.ok(words >= 40, "plugin README has at least 40 words outside code blocks");
assert.ok(statSync(join(root, "analyzeit/LICENSE")).isFile(), "LICENSE is inside the plugin folder");
assert.match(plugin.version, new RegExp(`^\\d+`));
const readme = readFileSync(join(root, "analyzeit/README.md"), "utf8");
assert.ok(readme.includes(min), "the README states the minimum command version");
for (const c of ["analyze", "overview", "status"]) assert.ok(statSync(join(root, `analyzeit/commands/${c}.md`)).isFile(), `command ${c} exists`);

const agent = readFileSync(join(root, "analyzeit/agents/analyzeit-analyst.md"), "utf8");
assert.match(agent, /^tools: mcp__plugin_analyzeit_analyzeit__\*$/m, "the sub-agent is limited to the AnalyzeIt tools");
for (const f of ["analyzeit/skills/analyzeit/SKILL.md", "analyzeit/agents/analyzeit-analyst.md", "analyzeit/commands/analyze.md", "analyzeit/README.md", "README.md"]) {
  const t = readFileSync(join(root, f), "utf8");
  assert.ok(!/backend-qwiq|onrender\.com|Authenticate/.test(t), `${f} still refers to the hosted connector`);
}
const tools = [...agent.matchAll(/`(list_datasets|analyze|privacy_policy)`/g)].map((m) => m[1]);
assert.ok(tools.length >= 3, "the analyst names the CLI's tools");
assert.ok(!/query_records|propose_import|request_access|create_project/.test(agent), "the analyst names no hosted-connector tools");

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
  assert.ok(!/(\.DS_Store|Thumbs\.db|desktop\.ini)$/.test(f), `${relative(root, f)} is a system file; the directory refuses it`);
  assert.ok(!f.includes(`${join(root, "analyzeit")}/`) || statSync(f).size < 256 * 1024 || f.endsWith(".png"), `${relative(root, f)} is over 256 KiB`);
  if (f.endsWith("check.mjs") || f.endsWith(".png")) continue;
  const text = readFileSync(f, "utf8");
  for (const re of patterns) assert.ok(!re.test(text), `${relative(root, f)} matches ${re}`);
}
console.log("ok");
