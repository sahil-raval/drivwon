/** Vercel function: POST /api/leads — stores website enquiries privately in Sanity. */
import type { IncomingMessage, ServerResponse } from "node:http";
import { handleLead } from "../server/leads.js";

async function readJson(req: IncomingMessage & { body?: unknown }) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > 64_000) throw new Error("Payload too large");
    chunks.push(chunk as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

export default async function handler(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.statusCode = 405; res.end(JSON.stringify({ error: "Method not allowed" })); return; }
  try {
    const ip = String(req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "unknown").split(",")[0].trim();
    const result = await handleLead(await readJson(req), ip);
    res.statusCode = result.status;
    res.end(JSON.stringify(result.json));
  } catch {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "Invalid request" }));
  }
}
