# ClinicNow — app (v1 real)

**Problema:** a clínica perde tempo e pacientes com recepção manual e agenda espalhada.
**Para quem:** clínicas pequenas; primeiro caso real será a clínica da mãe de Sostenes (por ora, tudo sintético).
**O que é:** o produto único da unificação (ver `docs/arquitetura.md`) — **v1** com sidebar de módulos e, funcionando de ponta a ponta: **Agenda** (semanal estilo Google Calendar, tela principal), **Emily** (recepcionista IA da ElevenLabs — cita os preços reais do catálogo em US$, propõe horário e agenda de verdade), **Pacientes** (com prontuário no Drive), **Serviços** (catálogo em dólar, editável), **Financeiro** (dia/semana, serviços + gorjetas) e **Configurações**. Crescimento, Lia e Vitrine aparecem como "em breve".
**Estado atual:** v1 funcional local; single-tenant, sem login — limitação documentada em `docs/decisoes/`. Google Agenda: código pronto via Composio, aguardando `composio link googlecalendar` (fallback .ics ativo).

## Como rodar

```bash
cp .env.example .env   # preencher ELEVENLABS_API_KEY
npm install
npm run dev            # sobe o token server (porta 4790) + Vite (porta 5190)
# http://localhost:5190
```

O agente da Emily já existe (`emily-agent-id.txt`). Para recriar: `npm run emily:create`.
Mudou preço na aba Serviços? `npm run emily:update` sincroniza o prompt da Emily com o catálogo do Supabase.
