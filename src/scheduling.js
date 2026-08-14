// Funções puras compartilhadas pelo demo e pelos testes. No modo owner, o banco
// também impõe esta regra; a UI nunca é a única barreira contra overbooking.
export function terminaEm(inicio, duracaoMin, bufferMin = 0) {
  const inicioMs = new Date(inicio).getTime();
  const duracao = Number(duracaoMin);
  const buffer = Number(bufferMin);
  if (!Number.isFinite(inicioMs) || !Number.isInteger(duracao) || duracao <= 0 || !Number.isInteger(buffer) || buffer < 0) throw new Error("início, duração ou buffer inválidos");
  return new Date(inicioMs + (duracao + buffer) * 60_000).toISOString();
}

export function sobrepoe(aInicio, aFim, bInicio, bFim) {
  return new Date(aInicio).getTime() < new Date(bFim).getTime() && new Date(bInicio).getTime() < new Date(aFim).getTime();
}

export function fimDaConsulta(consulta, servico = null) {
  const inicioMs = new Date(consulta.inicio).getTime();
  const fimSalvo = new Date(consulta.termina_em).getTime();
  if (Number.isFinite(fimSalvo) && fimSalvo > inicioMs) return new Date(fimSalvo).toISOString();
  const duracao = consulta.duracao_snapshot_min ?? servico?.duracao_min ?? 60;
  const buffer = consulta.buffer_snapshot_min ?? servico?.buffer_min ?? 0;
  return terminaEm(consulta.inicio, duracao, buffer);
}

export function conflitoComAgenda(consultas, inicio, duracaoMin, bufferMin = 0, ignorarId = null) {
  const fim = terminaEm(inicio, duracaoMin, bufferMin);
  return (consultas || []).filter((c) => c.id !== ignorarId && c.status !== "cancelada" && sobrepoe(inicio, fim, c.inicio, fimDaConsulta(c)));
}
