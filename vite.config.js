import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 5190 continua sendo a porta oficial do projeto (é a que está no CLAUDE.md e na allowlist de
// CORS da ponte de aprovação). PORT permite que um harness de preview atribua outra porta sem
// editar arquivo; nesse caso, exporte CLINICNOW_ORIGEM_EXTRA na ponte com a origem nova.
const porta = Number(process.env.PORT) || 5190;

export default defineConfig({
  plugins: [react()],
  server: { port: porta, strictPort: !process.env.PORT },
});
