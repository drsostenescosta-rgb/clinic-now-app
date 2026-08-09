# Arquitetura — clinic-now-app (v0)

Documento-mãe: `~/Applications/clinic-now-access/docs/ARQUITETURA_UNIFICACAO.md` (decisão aprovada 08/08/2026). Este arquivo resume só o que o v0 implementa.

## Fatia v0

```
Navegador (React+Vite PWA, porta 5190)
 ├─ aba Emily ──── WebSocket ElevenLabs (signed URL via server.mjs:4790; chave só no servidor)
 │                  agente "Emily — ClinicNow Recepção" (LLM claude-sonnet-4-5, voz pt da Emily)
 │                  proposta [PROPOSTA] → botão confirmar → insert clinicnow_consultas (origem=emily)
 ├─ aba Agenda ─── Supabase sosmed: clinicnow_consultas (select/insert, RLS)
 └─ aba Pacientes ─ Supabase sosmed: clinicnow_pacientes (select/insert, RLS)
```

- **Banco:** Supabase `sosmed` (`yaqphldowpshhrtvvfaq`, sa-east-1) — o banco da unificação (§4 do doc-mãe). Tabelas novas `clinicnow_pacientes` e `clinicnow_consultas` via migration `clinicnow_app_v0_pacientes_consultas`, RLS ligada, políticas anon select/insert restritas a elas.
- **Segurança v0:** nenhum dado real (tudo sintético); chave ElevenLabs só no `server.mjs`; chave Supabase é a publishable (pública por design, limitada pela RLS). Limitações conhecidas em `docs/decisoes/2026-08-08-v0-single-tenant-sem-login.md`.
- **Módulos "em breve"** (Vitrine, Lia, Paciente, Produtos, Crescimento, Atendimento Online): entram nas fases do doc-mãe §8, não antes.
