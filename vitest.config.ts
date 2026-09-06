import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // Les tests d'intégration RLS vivent dans /tests/rls avec leur
    // propre config (vitest.rls.config.ts) — jamais lancés par un
    // simple `npm test`, puisqu'ils appellent un vrai projet Supabase
    // par le réseau.
    include: ["src/**/*.test.ts"],
  },
});
