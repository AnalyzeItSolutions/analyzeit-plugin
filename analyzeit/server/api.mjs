// Thin, read-only client for the AnalyzeIt website API.
import { loadToken } from "./session.mjs";

export class NotSignedIn extends Error {
  constructor() { super("Not signed in to AnalyzeIt. Call the `login` tool: it opens the AnalyzeIt website for the user to approve."); }
}

export async function call(cfg, method, path, body, fetchImpl = fetch) {
  const token = loadToken(cfg);
  if (!token) throw new NotSignedIn();
  const r = await fetchImpl(`${cfg.api}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(60_000),
  });
  if (r.status === 401) throw new NotSignedIn();
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const d = data.detail;
    throw new Error(`AnalyzeIt: ${typeof d === "string" ? d : d?.message || `request failed (${r.status})`}`);
  }
  return data;
}

const seg = (v, what) => {
  if (typeof v !== "string" || !/^[\w.-]{1,128}$/.test(v)) throw new Error(`${what} must be an id or API name`);
  return encodeURIComponent(v);
};

export const api = {
  me: (c) => call(c, "GET", "/v1/auth/me"),
  projects: (c) => call(c, "GET", "/v1/projects"),
  objects: (c, project) => call(c, "GET", `/v1/projects/${seg(project, "project_id")}/objects`),
  datasets: (c, project) => call(c, "GET", `/v1/projects/${seg(project, "project_id")}/datasets`),
  query: (c, object, body) => call(c, "POST", `/v1/objects/${seg(object, "object")}/records/query`, body),
  aggregate: (c, object, body) => call(c, "POST", `/v1/objects/${seg(object, "object")}/aggregate`, body),
};
