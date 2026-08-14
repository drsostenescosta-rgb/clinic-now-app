# ClinicNow — fundação local E2

Protótipo de agenda para validar fluxos sem credenciais e sem dados reais. O estado comprovado é local: `synthetic` usa `localStorage` v3, exige aliases como `Paciente Demo 01` e bloqueia integrações externas. Estado legado/inválido é removido antes da exibição e só fica um registro de quarentena sem conteúdo/PII.

## Executar com segurança

```bash
npm install
npm run dev:synthetic
# http://localhost:5190
```

`npm run dev` aponta para o mesmo modo sintético. Ele sobe somente o Vite; não inicia o servidor de integrações.

## Modo owner (preparado, não ativado)

O código de login, RLS e RPCs está preparado, mas os SQLs staged **não foram aplicados nem verificados em Supabase remoto**. Leia [docs/e2-owner-mode-runbook.md](docs/e2-owner-mode-runbook.md). Buffer existe estruturalmente, mas o valor real de cada serviço deve vir da Andreia; os valores do modo synthetic são explicitamente demonstração.

```bash
cp .env.example .env
# definir VITE_CLINICNOW_MODE=owner e variáveis publishable do projeto correto
npm run dev:owner
```

`dev:owner` também sobe somente o Vite. Ausência de URL/chave gera erro explícito e fail-closed; não existe fallback sintético. Integrações externas continuam desativadas por padrão e o servidor E2 não lê segredos nem IDs de agentes.

## Fora desta etapa

WhatsApp, Instagram, Google Agenda, ElevenLabs, outbox, anamnese, importação de conversas e dados reais de pacientes. A pasta contém código histórico dessas integrações, mas o modo sintético não as chama.
