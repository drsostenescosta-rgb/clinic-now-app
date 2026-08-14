// Integração externa desativada na E2; somente o arquivo .ics local permanece.
export const TOKEN_SERVER = "http://localhost:4790";

export async function statusGoogleAgenda() {
  return { connected: false, reason: "integração fora da E2" };
}

// Stub explícito: uma fase futura deverá implementar autenticação e autorização.
export async function criarEventoGoogle(consulta, servico) {
  void consulta; void servico;
  return { ok: false, reason: "integração fora da E2" };
}

// Fallback: arquivo .ics da consulta (funciona sem nenhuma integração)
export function baixarICS(consulta, servico) {
  const ini = new Date(consulta.inicio);
  const fimPersistido = new Date(consulta.termina_em);
  const fim = Number.isFinite(fimPersistido.getTime()) && fimPersistido > ini
    ? fimPersistido
    : new Date(ini.getTime() + ((consulta.duracao_snapshot_min ?? servico?.duracao_min ?? 60) + (consulta.buffer_snapshot_min ?? servico?.buffer_min ?? 0)) * 60000);
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
