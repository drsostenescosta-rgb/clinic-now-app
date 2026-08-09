# ClinicNow — app (v0 real)

**Problema:** a clínica perde tempo e pacientes com recepção manual e agenda espalhada.
**Para quem:** clínicas pequenas; primeiro caso real será a clínica da mãe de Sostenes (por ora, tudo sintético).
**O que é:** o produto único da unificação (ver `docs/arquitetura.md`) — v0 REAL com 3 abas funcionando de ponta a ponta: **Emily** (recepcionista IA da ElevenLabs, chat de texto, propõe horários e agenda de verdade), **Agenda** e **Pacientes** (persistidos no Supabase `sosmed`). Demais módulos aparecem como "em breve".
**Estado atual:** v0 funcional local; single-tenant (uma clínica demo), sem login — limitação documentada em `docs/decisoes/`.

## Como rodar

```bash
cp .env.example .env   # preencher ELEVENLABS_API_KEY
npm install
npm run dev            # sobe o token server (porta 4790) + Vite (porta 5190)
# http://localhost:5190
```

O agente da Emily já existe (`emily-agent-id.txt`). Para recriar: `npm run emily:create`.
