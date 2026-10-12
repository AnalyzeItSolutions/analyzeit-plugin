#!/usr/bin/env node
// analyzeit-agent: answers a question about your AnalyzeIt data with the model of your choice.
// The same analyst instructions and tools the Claude plugin uses, driven over any provider's API.
//   node agent.mjs --provider openai --model <model> "top 5 customers by revenue"
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.mjs";
import { TOOLS, callTool } from "./tools.mjs";
import { adapters, resolveProvider } from "./providers.mjs";

const here = dirname(fileURLToPath(import.meta.url));

/** The analyst instructions live in one place: the sub-agent file. Frontmatter is dropped. */
export function analystPrompt(file = join(here, "../agents/analyzeit-analyst.md")) {
  const text = readFileSync(file, "utf8");
  return text.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
}

const CLIP = 30_000;

export async function runAgent({ question, provider, cfg, maxSteps = 12, fetchImpl = fetch, log = () => {}, system = analystPrompt() }) {
  const convo = [{ role: "user", text: question }];
  const adapter = adapters[provider.wire];
  for (let step = 1; step <= maxSteps; step++) {
    const turn = await adapter(provider, system, TOOLS, convo, fetchImpl);
    convo.push({ role: "assistant", text: turn.text, calls: turn.calls });
    if (!turn.calls.length) return turn.text.trim();
    for (const c of turn.calls) {
      log(`tool ${c.name} ${JSON.stringify(c.args)}`);
      const r = await callTool(cfg, c.name, c.args);
      let text = r.content?.[0]?.text ?? "";
      if (text.length > CLIP) text = `${text.slice(0, CLIP)}\n[truncated]`;
      convo.push({ role: "tool", id: c.id, name: c.name, text: r.isError ? `Error: ${text}` : text });
    }
  }
  return "I could not finish within the step limit. Ask a narrower question.";
}

function parse(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--verbose" || a === "-v") o.verbose = true;
    else if (a === "--help" || a === "-h") o.help = true;
    else if (["--provider", "--model", "--base-url", "--max-steps"].includes(a)) o[a.slice(2)] = argv[++i];
    else if (a.startsWith("--")) throw new Error(`Unknown option ${a}`);
    else o._.push(a);
  }
  return o;
}

const HELP = `analyzeit-agent [options] "<question>"

  --provider <name>   openai | xai (grok) | gemini | groq | mistral | openrouter | ollama | anthropic | custom
                      (default: ANALYZEIT_PROVIDER, else openai)
  --model <name>      model id (or ANALYZEIT_MODEL); none is assumed
  --base-url <url>    override the provider endpoint (any OpenAI-compatible server)
  --max-steps <n>     tool-use rounds, default 12
  -v, --verbose       print tool calls to stderr

API key comes from the provider's usual variable (OPENAI_API_KEY, XAI_API_KEY, GEMINI_API_KEY,
ANTHROPIC_API_KEY, ...) or ANALYZEIT_LLM_API_KEY. AnalyzeIt sign-in opens the website the first time.
Note: results the tools read are sent to the provider you choose.`;

const isMain = process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  try {
    const o = parse(process.argv.slice(2));
    if (o.help || !o._.length) { console.log(HELP); process.exit(o.help ? 0 : 2); }
    const provider = resolveProvider(o.provider || process.env.ANALYZEIT_PROVIDER || "openai", process.env, { model: o.model, base: o["base-url"] });
    const out = await runAgent({
      question: o._.join(" "), provider, cfg: loadConfig(), maxSteps: Math.min(Math.max(Number(o["max-steps"]) || 12, 1), 30),
      log: o.verbose ? (m) => process.stderr.write(`${m}\n`) : undefined,
    });
    console.log(out);
  } catch (e) {
    process.stderr.write(`${e.message}\n`);
    process.exit(1);
  }
}
