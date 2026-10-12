// Adapters that turn one chat turn into a provider call. Two wire formats cover almost everything:
//  - "openai": the OpenAI chat-completions format, also spoken by xAI (Grok), Gemini's compatibility
//    endpoint, Groq, Mistral, OpenRouter, Together, Ollama, LM Studio, vLLM ...
//  - "anthropic": the Anthropic Messages API.
// Each adapter takes a normalised conversation and returns { text, calls: [{id, name, args}], raw }.

export const PRESETS = {
  openai: { wire: "openai", base: "https://api.openai.com/v1", key: "OPENAI_API_KEY" },
  xai: { wire: "openai", base: "https://api.x.ai/v1", key: "XAI_API_KEY" },
  grok: { wire: "openai", base: "https://api.x.ai/v1", key: "XAI_API_KEY" },
  gemini: { wire: "openai", base: "https://generativelanguage.googleapis.com/v1beta/openai", key: "GEMINI_API_KEY" },
  groq: { wire: "openai", base: "https://api.groq.com/openai/v1", key: "GROQ_API_KEY" },
  mistral: { wire: "openai", base: "https://api.mistral.ai/v1", key: "MISTRAL_API_KEY" },
  openrouter: { wire: "openai", base: "https://openrouter.ai/api/v1", key: "OPENROUTER_API_KEY" },
  ollama: { wire: "openai", base: "http://localhost:11434/v1", key: null },
  anthropic: { wire: "anthropic", base: "https://api.anthropic.com", key: "ANTHROPIC_API_KEY" },
  claude: { wire: "anthropic", base: "https://api.anthropic.com", key: "ANTHROPIC_API_KEY" },
  custom: { wire: "openai", base: null, key: "ANALYZEIT_LLM_API_KEY" },
};

export function resolveProvider(name, env = process.env, overrides = {}) {
  const preset = PRESETS[name];
  if (!preset) throw new Error(`Unknown provider "${name}". Use one of: ${Object.keys(PRESETS).join(", ")}.`);
  const base = (overrides.base || env.ANALYZEIT_LLM_BASE_URL || preset.base || "").replace(/\/+$/, "");
  if (!base) throw new Error("This provider needs --base-url (or ANALYZEIT_LLM_BASE_URL).");
  let u;
  try { u = new URL(base); } catch { throw new Error("base URL is not a valid URL"); }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
  if (!(u.protocol === "https:" || (u.protocol === "http:" && local)) || u.username || u.password) {
    throw new Error("base URL must be https (http only for localhost) and carry no credentials");
  }
  const key = env.ANALYZEIT_LLM_API_KEY || (preset.key ? env[preset.key] : "") || "";
  if (!key && preset.key && !local) throw new Error(`Set ${preset.key} (or ANALYZEIT_LLM_API_KEY) to use ${name}.`);
  const model = overrides.model || env.ANALYZEIT_MODEL;
  if (!model) throw new Error("Pick a model with --model or ANALYZEIT_MODEL (model names change, so none is assumed).");
  return { wire: preset.wire, base: base, key, model };
}

async function post(url, headers, body, fetchImpl) {
  const r = await fetchImpl(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(120_000) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Model provider error ${r.status}: ${data.error?.message || data.error || JSON.stringify(data).slice(0, 200)}`);
  return data;
}

const parseArgs = (s) => { try { return s ? JSON.parse(s) : {}; } catch { return {}; } };

/** Conversation items: {role:"user",text} | {role:"assistant",text,calls,raw} | {role:"tool",id,name,text} */
export const adapters = {
  async openai(p, system, tools, convo, fetchImpl) {
    const messages = [{ role: "system", content: system }];
    for (const m of convo) {
      if (m.role === "user") messages.push({ role: "user", content: m.text });
      else if (m.role === "assistant") messages.push({ role: "assistant", content: m.text || null, ...(m.calls?.length ? { tool_calls: m.calls.map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: JSON.stringify(c.args) } })) } : {}) });
      else messages.push({ role: "tool", tool_call_id: m.id, content: m.text });
    }
    const data = await post(`${p.base}/chat/completions`, p.key ? { authorization: `Bearer ${p.key}` } : {}, {
      model: p.model, messages,
      tools: tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.inputSchema } })),
    }, fetchImpl);
    const msg = data.choices?.[0]?.message || {};
    return { text: msg.content || "", calls: (msg.tool_calls || []).map((c) => ({ id: c.id, name: c.function?.name, args: parseArgs(c.function?.arguments) })) };
  },

  async anthropic(p, system, tools, convo, fetchImpl) {
    const messages = [];
    for (const m of convo) {
      if (m.role === "user") messages.push({ role: "user", content: m.text });
      else if (m.role === "assistant") {
        const content = [];
        if (m.text) content.push({ type: "text", text: m.text });
        for (const c of m.calls || []) content.push({ type: "tool_use", id: c.id, name: c.name, input: c.args });
        messages.push({ role: "assistant", content });
      } else {
        const block = { type: "tool_result", tool_use_id: m.id, content: m.text };
        const last = messages[messages.length - 1];
        if (last?.role === "user" && Array.isArray(last.content)) last.content.push(block);
        else messages.push({ role: "user", content: [block] });
      }
    }
    const data = await post(`${p.base}/v1/messages`, { "x-api-key": p.key, "anthropic-version": "2023-06-01" }, {
      model: p.model, max_tokens: 4096, system, messages,
      tools: tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema })),
    }, fetchImpl);
    const blocks = data.content || [];
    return {
      text: blocks.filter((b) => b.type === "text").map((b) => b.text).join("\n"),
      calls: blocks.filter((b) => b.type === "tool_use").map((b) => ({ id: b.id, name: b.name, args: b.input || {} })),
    };
  },
};
