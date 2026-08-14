// Identificadores deliberadamente artificiais: bloqueiam nomes/telefones reais.
export const PADRAO_ALIAS_SINTETICO = /^Paciente Demo \d{2}$/;
export function validarAliasSintetico(valor) {
  return PADRAO_ALIAS_SINTETICO.test(String(valor || "").trim());
}
export const EXEMPLO_ALIAS_SINTETICO = "Paciente Demo 01";
