import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 4100 },
  // `pnpm start` serves the built files in production (e.g. on Railway),
  // where the public hostname is not known in advance.
  preview: { port: 4100, allowedHosts: true },
});
