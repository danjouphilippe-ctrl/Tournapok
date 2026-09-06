import { defineConfig } from "vitest/config";

// Config séparée et volontairement isolée de vitest.config.ts : ces
// tests appellent un vrai projet Supabase par le réseau (le projet de
// test "tournapok-test", jamais la production — tests/rls/setup.ts
// refuse de démarrer si l'URL configurée ressemble à la prod). Lancés
// uniquement via `npm run test:rls`, jamais par un simple `npm test`.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/rls/**/*.test.ts"],
    setupFiles: ["tests/rls/setup.ts"],
    testTimeout: 20000,
    // Ces tests créent des comptes/lignes réels sur le projet de test
    // et se gênent s'ils tournent en parallèle sur les mêmes fixtures
    // partagées (clubs/tournois nommés par test, mais Supabase peut
    // rate-limiter les inscriptions rapprochées).
    fileParallelism: false,
  },
});
