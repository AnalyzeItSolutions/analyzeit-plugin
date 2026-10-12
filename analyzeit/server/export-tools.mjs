#!/usr/bin/env node
// Writes the tool definitions in each vendor's function-calling format to ../tools/, for anyone wiring
// AnalyzeIt into their own agent. `node export-tools.mjs --check` fails if the files are out of date.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { TOOLS } from "./tools.mjs";

const dir = join(dirname(fileURLToPath(import.meta.url)), "../tools");
const files = {
  "openai.json": TOOLS.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.inputSchema } })),
  "anthropic.json": TOOLS.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema })),
  "gemini.json": [{ function_declarations: TOOLS.map((t) => ({ name: t.name, description: t.description, parameters: t.inputSchema })) }],
  "mcp.json": TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
};
const render = (v) => `${JSON.stringify(v, null, 2)}\n`;
if (process.argv.includes("--check")) {
  const stale = Object.entries(files).filter(([n, v]) => !existsSync(join(dir, n)) || readFileSync(join(dir, n), "utf8") !== render(v)).map(([n]) => n);
  if (stale.length) { console.error(`Out of date: ${stale.join(", ")}. Run: node server/export-tools.mjs`); process.exit(1); }
  console.log("tool definitions up to date");
} else {
  mkdirSync(dir, { recursive: true });
  for (const [n, v] of Object.entries(files)) writeFileSync(join(dir, n), render(v));
  console.log(`wrote ${Object.keys(files).length} files to ${dir}`);
}
