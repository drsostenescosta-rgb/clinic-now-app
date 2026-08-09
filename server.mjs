#!/usr/bin/env node
// Servidorzinho local do ClinicNow — único papel: gerar a signed URL do agente
// ElevenLabs da Emily. A chave da API fica AQUI, nunca no navegador.
// Uso: node server.mjs  → http://localhost:4790/signed-url
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
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

const CORS = {
  "Access-Control-Allow-Origin": "http://localhost:5190",
  "Access-Control-Allow-Headers": "content-type",
};

createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.writeHead(204, CORS);
      res.end();
    } else if (req.url === "/signed-url") {
      const r = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${AGENT_ID}`,
        { headers: { "xi-api-key": KEY } }
      );
      res.writeHead(r.ok ? 200 : 502, { "Content-Type": "application/json", ...CORS });
      res.end(JSON.stringify(await r.json()));
    } else {
      res.writeHead(404, CORS);
      res.end("not found");
    }
  } catch (e) {
    res.writeHead(500, { "Content-Type": "application/json", ...CORS });
    res.end(JSON.stringify({ error: e.message }));
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`ClinicNow token server: http://localhost:${PORT}/signed-url`);
});
