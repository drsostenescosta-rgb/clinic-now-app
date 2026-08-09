#!/usr/bin/env node
// Servidorzinho local do ClinicNow:
//  - GET  /signed-url   → signed URL do agente ElevenLabs da Emily (chave fica AQUI, nunca no navegador)
//  - GET  /gcal-status  → estado real da conexão Google Calendar via Composio (cache 60s)
//  - POST /gcal-event   → cria evento no Google Agenda via Composio CLI (best-effort; o app tem fallback .ics)
// Uso: node server.mjs  → http://localhost:4790
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
if (existsSync(join(ROOT, ".env"))) {
  for (const line of readFileSync(join(ROOT, ".env"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = readFileSync(join(ROOT, "emily-agent-id.txt"), "utf8").trim();
const PORT = 4790;
const COMPOSIO =
  process.env.COMPOSIO_BIN ||
  [join(homedir(), ".composio", "composio"), "/usr/local/bin/composio"].find(existsSync) ||
  "composio";
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles";

const CORS = {
  "Access-Control-Allow-Origin": "http://localhost:5190",
  "Access-Control-Allow-Headers": "content-type",
};

function composio(args, timeoutMs = 30000) {
  return new Promise((resolve) => {
    execFile(COMPOSIO, args, { timeout: timeoutMs }, (err, stdout) => {
      try {
        resolve(JSON.parse(stdout));
      } catch {
        resolve({ successful: false, error: err ? String(err.message) : "resposta não-JSON do composio" });
      }
    });
  });
}

let statusCache = { at: 0, value: null };
async function gcalStatus() {
  if (statusCache.value && Date.now() - statusCache.at < 60_000) return statusCache.value;
  const conns = await composio(["connections", "list"]);
  const ativa = Array.isArray(conns?.googlecalendar)
    ? conns.googlecalendar.some((c) => c.status === "ACTIVE")
    : false;
  statusCache = { at: Date.now(), value: { connected: ativa } };
  return statusCache.value;
}

async function gcalCreateEvent({ summary, description, start_iso, duration_min }) {
  if (!summary || !start_iso) return { ok: false, reason: "summary e start_iso são obrigatórios" };
  const r = await composio([
    "execute",
    "GOOGLECALENDAR_CREATE_EVENT",
    "-d",
    JSON.stringify({
      summary,
      description: description || "",
      start_datetime: start_iso,
      event_duration_minutes: Number(duration_min) || 60,
      timezone: TZ,
    }),
  ]);
  const id = r?.data?.response_data?.id || r?.data?.id;
  if (r?.successful && id) {
    statusCache = { at: Date.now(), value: { connected: true } };
    return { ok: true, event_id: id, link: r?.data?.response_data?.htmlLink || null };
  }
  return { ok: false, reason: r?.error || "Composio não confirmou a criação do evento" };
}

function readBody(req) {
  return new Promise((resolve) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(b || "{}"));
      } catch {
        resolve({});
      }
    });
  });
}

createServer(async (req, res) => {
  const json = (code, obj) => {
    res.writeHead(code, { "Content-Type": "application/json", ...CORS });
    res.end(JSON.stringify(obj));
  };
  try {
    if (req.method === "OPTIONS") {
      res.writeHead(204, CORS);
      res.end();
    } else if (req.url === "/signed-url") {
      const r = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${AGENT_ID}`,
        { headers: { "xi-api-key": KEY } }
      );
      json(r.ok ? 200 : 502, await r.json());
    } else if (req.url === "/gcal-status") {
      json(200, await gcalStatus());
    } else if (req.url === "/gcal-event" && req.method === "POST") {
      const out = await gcalCreateEvent(await readBody(req));
      json(200, out); // 200 sempre: o "ok" no corpo diz a verdade; o app decide o fallback
    } else {
      res.writeHead(404, CORS);
      res.end("not found");
    }
  } catch (e) {
    json(500, { error: e.message });
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`ClinicNow token server: http://localhost:${PORT} (signed-url, gcal-status, gcal-event)`);
});
