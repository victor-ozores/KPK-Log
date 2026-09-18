import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Permite pre-visualizar o dev server em ambientes de sandbox que
  // fazem proxy por um host dinamico (ex.: v0.app / Vercel sandboxes,
  // *.vercel.run) — sem isso o Vite recusa a requisicao (protecao
  // padrao contra DNS rebinding). Nao afeta o build de producao
  // (`vite build`), que nao usa esse dev server.
  server: {
    allowedHosts: [".vercel.run", ".vercel.app"],
  },
});
