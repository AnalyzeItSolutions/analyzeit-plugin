// Minimal MCP (JSON-RPC 2.0) request handling, independent of the transport.
import { TOOLS, callTool } from "./tools.mjs";

export const SERVER_INFO = { name: "analyzeit", version: "0.3.0" };

/** @returns the response object, or undefined for notifications. */
export async function handleMessage(cfg, msg) {
  const { id, method, params } = msg || {};
  const ok = (result) => ({ jsonrpc: "2.0", id, result });
  const err = (code, message) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
  if (id === undefined) return undefined; // notification (e.g. notifications/initialized)
  switch (method) {
    case "initialize":
      return ok({ protocolVersion: params?.protocolVersion || "2025-03-26", capabilities: { tools: {} }, serverInfo: SERVER_INFO });
    case "tools/list":
      return ok({ tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    case "tools/call":
      return ok(await callTool(cfg, params?.name, params?.arguments));
    case "ping":
      return ok({});
    default:
      return err(-32601, `Method not found: ${method}`);
  }
}
