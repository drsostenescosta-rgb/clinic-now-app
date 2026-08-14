#!/usr/bin/env node
import { createServer } from "node:http";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CORS = { "Access-Control-Allow-Origin": "http://localhost:5190", "Access-Control-Allow-Headers": "content-type" };
const EXTERNOS = new Set(["/signed-url", "/gcal-status", "/gcal-event"]);

// E2 não implementa integrações. Uma fase futura precisará fornecer AO MESMO
// TEMPO uma flag explícita e autenticação de cada request; ainda assim este
// handler retorna 501 até a integração ser projetada e revisada.
export function criarHandler({ integracoesHabilitadas = false, autenticar = async () => false } = {}) {
  return async function handler(req, res) {
    const json = (code, obj) => { res.writeHead(code, { "Content-Type": "application/json", ...CORS }); res.end(JSON.stringify(obj)); };
    if (req.method === "OPTIONS") { res.writeHead(204, CORS); res.end(); return; }
    if (EXTERNOS.has(req.url)) {
      const autenticado = integracoesHabilitadas ? await autenticar(req) : false;
      if (!integracoesHabilitadas || !autenticado) { json(403, { ok: false, code: "external_integration_disabled" }); return; }
      json(501, { ok: false, code: "external_integration_not_implemented" }); return;
    }
    res.writeHead(404, CORS); res.end("not found");
  };
}

const executadoDiretamente = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (executadoDiretamente) createServer(criarHandler()).listen(4790, "127.0.0.1", () => console.log("ClinicNow E2 server: integrações externas desabilitadas"));
