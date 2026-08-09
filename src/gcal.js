// Integração Google Agenda (best-effort via token-server → Composio) + fallback .ics
import { supabase } from "./supabase.js";

export const TOKEN_SERVER = "http://localhost:4790";

export async function statusGoogleAgenda() {
  try {
    const r = await fetch(`${TOKEN_SERVER}/gcal-status`);
    if (!r.ok) return { connected: false };
    return await r.json();
  } catch {
    return { connected: false };
  }
}

// Tenta criar o evento no Google Agenda e gravar o google_event_id na consulta.
// NUNCA lança: devolve { ok, event_id? , reason? } — o chamador decide o fallback.
export async function criarEventoGoogle(consulta, servico) {
  try {
    const r = await fetch(`${TOKEN_SERVER}/gcal-event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: `${consulta.servico} — ${consulta.paciente_nome}`,
        description: `Consulta ClinicNow (${consulta.origem}).`,
        start_iso: consulta.inicio,
        duration_min: servico?.duracao_min || 60,
      }),
    });
    const out = await r.json();
    if (out.ok && out.event_id) {
      await supabase
        .from("clinicnow_consultas")
        .update({ google_event_id: out.event_id })
        .eq("id", consulta.id);
      return out;
    }
    return { ok: false, reason: out.reason || "sem resposta do Composio" };
  } catch (e) {
    return { ok: false, reason: String(e?.message || e) };
  }
}

// Fallback: arquivo .ics da consulta (funciona sem nenhuma integração)
export function baixarICS(consulta, servico) {
  const ini = new Date(consulta.inicio);
  const fim = new Date(ini.getTime() + (servico?.duracao_min || 60) * 60000);
  const fmt = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ClinicNow//v1//PT-BR",
    "BEGIN:VEVENT",
    `UID:clinicnow-${consulta.id}`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(ini)}`,
    `DTEND:${fmt(fim)}`,
    `SUMMARY:${consulta.servico} — ${consulta.paciente_nome}`,
    "DESCRIPTION:Consulta ClinicNow",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = `consulta-${consulta.inicio.slice(0, 16).replace(/[T:]/g, "-")}.ics`;
  a.click();
  URL.revokeObjectURL(a.href);
}
