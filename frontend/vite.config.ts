import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Собираем прямо в ../frontend/dist, его отдаёт FastAPI (см. api.py).
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    // при `npm run dev` фронтенд ходит в локальный API на 8000
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
});
