# E2 owner — runbook de aplicação futura

Estado em 2026-08-11: dois SQLs staged e um runner administrativo psql foram escritos localmente. **Nenhum foi aplicado ou validado em Supabase/psql remoto.** Eles ficam fora de `supabase/migrations` para impedir aplicação automática cega.

## Ordem obrigatória

1. Fazer backup do projeto correto e registrar seu identificador.
2. Aplicar `supabase/e2-staged/20260811_001_e2_containment_schema.sql`. Ela adiciona colunas nullable e revoga imediatamente `PUBLIC`, `anon` e `authenticated`.
3. Criar/confirmar a usuária dona em `auth.users`. Preencher `buffer_min` de cada serviço com a resposta explícita da dona; zero também precisa ser uma decisão explícita.
4. Executar manualmente `supabase/admin/20260811_002_e2_bootstrap_backfill.psql` com `-v owner_id` e `-v clinic_name`. O arquivo é imutável, assume legado single-tenant, deriva duração+buffer e aborta em buffer ausente, owner ausente, órfãos, status inválido ou sobreposições.
5. Inspecionar contagens e amostras sem PII. Só então aplicar `supabase/e2-staged/20260811_003_e2_finalize_security.sql`, que cria NOT NULL, CHECK, trigger, exclusão GiST, RLS e RPCs.
6. Com duas contas de teste sintéticas, provar: dona A não lê clínica B; `anon` não lê/escreve; insert/update direto são negados; somente as RPCs criam paciente/reserva; concorrência devolve um conflito.

Exemplo de comando administrativo local (não executado aqui):

```bash
psql "$CLINICNOW_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/e2-staged/20260811_001_e2_containment_schema.sql
# preencher buffer_min de cada serviço por uma operação administrativa revisada
psql "$CLINICNOW_DATABASE_URL" -v ON_ERROR_STOP=1 -v owner_id='UUID_CONFIRMADO' -v clinic_name='NOME_CONFIRMADO' -f supabase/admin/20260811_002_e2_bootstrap_backfill.psql
psql "$CLINICNOW_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/e2-staged/20260811_003_e2_finalize_security.sql
```

Não colocar a URL do banco no repositório ou no histórico do shell. Não mover estes arquivos para uma pasta de migrations automáticas nem mandar um runner aplicar 001→003 cegamente: há uma decisão humana obrigatória de owner, clínica e buffer entre as etapas.

## Contrato final pretendido (ainda não provado remotamente)

- Navegador autenticado recebe apenas `SELECT` sobre linhas da própria clínica.
- `criar_paciente`, `reservar_consulta` e `atualizar_consulta` derivam a clínica de `auth.uid()`.
- Preço, duração, buffer e `termina_em` derivam do serviço; cliente não recebe grants diretos para escrevê-los.
- Status é obrigatório e limitado a `agendada`, `concluida` ou `cancelada`.
- A exclusão transacional impede intervalos ativos sobrepostos por clínica.

Até a verificação terminar: rodar `npm run dev:synthetic`, usar apenas `Paciente Demo NN` e não inserir nomes, telefones, links, conversas ou informações clínicas reais.
