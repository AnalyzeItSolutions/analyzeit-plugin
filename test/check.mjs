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
assert.ok(!/\b(npx|uvx|pipx|curl|wget)\b/.test(sh), "launcher downloads and installs nothing");
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
assert.match(agent, /^tools: mcp__plugin_analyzeit_analyzeit__\*, mcp__plugin_analyzeit_analyzeit-cloud__\*$/m, "the sub-agent is limited to the AnalyzeIt tools (local and hosted)");
for (const f of ["analyzeit/agents/analyzeit-analyst.md", "analyzeit/commands/analyze.md"]) {
  const t = readFileSync(join(root, f), "utf8");
  assert.ok(!/backend-qwiq|onrender\.com|Authenticate/.test(t), `${f} still refers to the hosted connector`);
}
// The hosted server is declared, so it must be disclosed where users and the directory scan look.
const hosted = json("analyzeit/.mcp.json").mcpServers["analyzeit-cloud"];
assert.ok(hosted && hosted.url, "hosted server is declared");
const host = new URL(hosted.url).host;
for (const f of ["analyzeit/README.md", "SECURITY.md", "analyzeit/.claude-plugin/plugin.json"]) assert.ok(readFileSync(join(root, f), "utf8").includes(host), `${f} discloses ${host}`);
const tools = [...agent.matchAll(/`(list_datasets|analyze|privacy_policy)`/g)].map((m) => m[1]);
assert.ok(tools.length >= 3, "the analyst names the CLI's tools");
// Online data goes through the hosted named analyses (results only); rows are a last resort and approvals are the user's.
assert.ok(/prefer them to `query_records`/.test(agent), "the analyst prefers results-only analyses to reading rows");
assert.ok(/request_access/.test(agent) && /link/.test(agent), "the analyst hands access to the user by link");

// The hook that answers a data question before the model is called: without it, every data question is the model's.
const hooks = json("analyzeit/hooks/hooks.json").hooks;
assert.ok(hooks.UserPromptSubmit?.length, "the plugin hooks the message before the model is called");
const promptHook = hooks.UserPromptSubmit[0].hooks[0].command;
assert.match(promptHook, /prompt-hook\.sh" prompt/, "the prompt hook runs the launcher script");
assert.ok((hooks.PostToolUse?.length ?? 0) > 0, "the tool hook notes when the model reads the file anyway");
const sessionStart = (hooks.SessionStart ?? []).flatMap((m) => m.hooks ?? []).map((h) => h.command);
assert.ok(sessionStart.some((c) => /prompt-hook\.sh" notice/.test(c)), "session start says when the hook is off or cannot run");

// The launcher of the hook: the newest analyzeit that is new enough, not the first on PATH (an old copy left in
// /usr/local/bin must not hide a current one in ~/.local/bin, or the hook answers with the old build).
const hookScript = readFileSync(join(root, "analyzeit/scripts/prompt-hook.sh"), "utf8");
assert.match(hookScript, /^#!\/bin\/sh/);
assert.match(hookScript, /version_of\(\)/, "the hook checks the version of every copy it finds");
assert.match(hookScript, /newer_or_equal "\$v" "\$MIN"/, "the hook takes the newest copy that is new enough");
assert.match(hookScript, /exec "\$bin" hook/, "the hook runs the command's hook");
for (const v of ["0.9.0", "0.10.0", "0.9.1"]) {
    const d = mkdtempSync(join(tmpdir(), "azhook-"));
    const f = join(d, "analyzeit");
    writeFileSync(f, `#!/bin/sh\n[ "$1" = --version ] && echo "analyzeit ${v}" && exit 0\necho "HOOKED:$*"\n`);
    chmodSync(f, 0o755);
    const r = spawnSync("sh", [join(root, "analyzeit/scripts/prompt-hook.sh"), "prompt"], { env: { PATH: `${d}:/usr/bin:/bin`, HOME: "/nonexistent" }, encoding: "utf8" });
    assert.equal(r.stdout.trim(), "HOOKED:hook prompt", `analyzeit ${v} runs the hook`);
    rmSync(d, { recursive: true, force: true });
}
const oldHook = mkdtempSync(join(tmpdir(), "azhook-"));
writeFileSync(join(oldHook, "analyzeit"), `#!/bin/sh\n[ "$1" = --version ] && echo "analyzeit 0.8.0" && exit 0\necho "HOOKED:$*"\n`);
chmodSync(join(oldHook, "analyzeit"), 0o755);
const oldRun = spawnSync("sh", [join(root, "analyzeit/scripts/prompt-hook.sh"), "prompt"], { env: { PATH: `${oldHook}:/usr/bin:/bin`, HOME: "/nonexistent" }, encoding: "utf8" });
assert.ok(!oldRun.stdout.includes("HOOKED"), "an old command is never called (it would read 'hook prompt' as a question)");
rmSync(oldHook, { recursive: true, force: true });

// The hook is on by default, and a hook that cannot run says so instead of quietly passing every question to the
// model: the launcher writes a note that doctor and the session-start notice read, and clears it once a working
// command is found.
const store = mkdtempSync(join(tmpdir(), "azstore-"));
const problem = join(store, "hook-problem.txt");
const launch = (bin, mode) =>
  spawnSync("sh", [join(root, "analyzeit/scripts/prompt-hook.sh"), mode], {
    env: { PATH: "/usr/bin:/bin", HOME: "/nonexistent", ANALYZEIT_HOME: store, ANALYZEIT_BIN: bin },
    encoding: "utf8",
  });
const fakeHook = (name, version) => {
  const f = join(store, name);
  writeFileSync(f, `#!/bin/sh\n[ "$1" = --version ] && echo "analyzeit ${version}" && exit 0\necho "HOOKED:$*"\n`);
  chmodSync(f, 0o755);
  return f;
};
const missingRun = launch(join(store, "missing"), "prompt");
assert.equal(missingRun.status, 0, "a missing command does not break the turn");
assert.match(readFileSync(problem, "utf8"), /not installed/, "a missing command is written down for doctor");
assert.match(launch(join(store, "missing"), "notice").stdout, /"systemMessage".*not installed/, "session start says the command is missing");
const staleRun = launch(fakeHook("old", "0.8.0"), "prompt");
assert.equal(staleRun.status, 0);
assert.match(readFileSync(problem, "utf8"), /too old/, "a too-old command is written down for doctor");
assert.match(launch(fakeHook("old", "0.8.0"), "notice").stdout, /"systemMessage".*too old/, "session start says the command is too old");
const goodRun = launch(fakeHook("good", "0.9.3"), "prompt");
assert.equal(goodRun.stdout.trim(), "HOOKED:hook prompt", "a working command runs the prompt hook");
assert.ok(!existsSync(problem), "a working command clears the note");
assert.equal(launch(fakeHook("good", "0.9.3"), "notice").stdout.trim(), "HOOKED:hook notice", "the notice asks the command whether the hook is on");
assert.match(hookScript, /hook-problem\.txt/, "the launcher writes the note doctor reads");
rmSync(store, { recursive: true, force: true });

// Default on: installing the plugin is the whole setting. Only an explicit off turns the hook off.
for (const f of ["analyzeit/README.md", "analyzeit/skills/analyzeit/SKILL.md"]) {
  const t = readFileSync(join(root, f), "utf8");
  assert.match(t, /on by default/i, `${f} says the hook is on by default`);
  assert.match(t, /analyzeit hook off/, `${f} says how to turn it off`);
}
assert.match(readme, /analyzeit hook on/, "the README names the switch that turns it back on");

// The rule the model follows: when the device has already answered, the answer is relayed and nothing else is done.
// Without it in the skill, the agent and the command, the model starts again from the top for a result that is given.
const RULE = /already answered on the user's device|already carries that answer/;
for (const f of ["analyzeit/skills/analyzeit/SKILL.md", "analyzeit/agents/analyzeit-analyst.md", "analyzeit/commands/analyze.md"]) {
    const t = readFileSync(join(root, f), "utf8");
    assert.match(t, RULE, `${f} says that the device may have answered already`);
    assert.match(t, /do not spawn (a |the )?(sub-agent|analyst)|not spawn the analyst sub-agent|only then, use the tools/i, `${f} says not to spawn the analyst when the answer is there`);
}
assert.match(readFileSync(join(root, "analyzeit/commands/status.md"), "utf8"), /doctor/, "the status command says whether the hook is installed");

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
