// Browser sign-in: loopback redirect + PKCE (RFC 8252), the same flow the AnalyzeIt CLI and desktop app use.
// The user signs in and clicks Allow on the AnalyzeIt website; this plugin never sees a password.
import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { spawn } from "node:child_process";

const b64url = (buf) => buf.toString("base64url");
export const challengeFor = (verifier) => b64url(createHash("sha256").update(verifier).digest());

export function openBrowser(url) {
  if (!/^https?:\/\//.test(url)) return false;
  const [cmd, args] =
    process.platform === "darwin" ? ["open", [url]]
    : process.platform === "win32" ? ["rundll32", ["url.dll,FileProtocolHandler", url]]
    : ["xdg-open", [url]];
  try {
    const p = spawn(cmd, args, { stdio: "ignore", detached: true });
    p.on("error", () => {});
    p.unref();
    return true;
  } catch { return false; }
}

const PAGE = (ok, title, body) =>
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AnalyzeIt</title>` +
  `<body style="font:16px system-ui;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center"><main><h1 style="color:${ok ? "#2f9e6b" : "#c0392b"}">${title}</h1><p>${body}</p></main>`;

/** Starts the listener and returns the sign-in URL plus a promise for the one-time code. */
export function startLogin(cfg, { timeoutMs = 300_000, onUrl } = {}) {
  const verifier = b64url(randomBytes(32));
  const state = b64url(randomBytes(24));
  return new Promise((resolveStart, rejectStart) => {
    let done;
    const result = new Promise((res, rej) => (done = { res, rej }));
    const server = createServer((req, res) => {
      const u = new URL(req.url, "http://127.0.0.1");
      const send = (status, html) => { res.writeHead(status, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "referrer-policy": "no-referrer", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'" }); res.end(html); };
      if (u.pathname !== "/callback") return send(404, PAGE(false, "Not found", ""));
      const code = u.searchParams.get("code");
      if (u.searchParams.get("state") !== state || !code) return send(400, PAGE(false, "Sign-in failed", "This link does not match the request. Start again from Claude."));
      send(200, PAGE(true, "Signed in", "You can close this tab and go back to Claude."));
      done.res({ code, verifier });
      server.close();
    });
    server.on("error", rejectStart);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      const url = `${cfg.site}/native-login?${new URLSearchParams({ port: String(port), state, challenge: challengeFor(verifier), client: "plugin" })}`;
      const timer = setTimeout(() => { server.close(); done.rej(new Error("Sign-in timed out. Ask me to sign in again.")); }, timeoutMs);
      result.finally(() => clearTimeout(timer)).catch(() => {});
      resolveStart({ url, result });
    });
  });
}

export async function exchange(cfg, { code, verifier }, fetchImpl = fetch) {
  const r = await fetchImpl(`${cfg.api}/v1/auth/native/token`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code, verifier }) });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof body.detail === "string" ? body.detail : "Sign-in could not be completed.");
  return { token: body.token, email: body.user?.email };
}
